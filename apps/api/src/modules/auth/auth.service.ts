import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import type {
  AuthTokens,
  LoginInput,
  PublicUser,
  RegisterInput,
} from '@aduva/shared';
import { AppDomainError, ErrorCode } from '../../common/error-codes';
import { PrismaService } from '../../common/prisma';
import { ForgotPasswordInput, ResetPasswordInput } from './auth.schemas';
import { SmsProvider } from './sms.provider';
import { SocialVerifier } from './social.verifier';

const OTP_TTL_MS = 3 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_WINDOW_MS = 60 * 1000;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');

// Bellek-sert (Memory-Hard) Parola Hashleme (Argon2id/scrypt N=16384,r=8,p=1) + bcrypt geriye dönük uyumluluk
export function hashPasswordMemoryHard(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `$scrypt$16384$8$1$${salt}$${derived}`;
}

export async function verifyPasswordMemoryHard(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) {
    // Zamanlama saldırısına karşı sahte doğrulama
    scryptSync(password, '00000000000000000000000000000000', 64, { N: 16384, r: 8, p: 1 });
    return false;
  }
  if (storedHash.startsWith('$scrypt$')) {
    const parts = storedHash.split('$');
    const salt = parts[5] ?? '';
    const expectedHex = parts[6] ?? '';
    const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    return derived.length === expectedBuf.length && timingSafeEqual(derived, expectedBuf);
  }
  return bcrypt.compare(password, storedHash);
}

export function toPublicUser(u: {
  id: string;
  email: string | null;
  phone: string | null;
  name?: string | null;
  role: Role | string;
  firstName?: string | null;
  lastName?: string | null;
}): PublicUser {
  let firstName = u.firstName ?? null;
  let lastName = u.lastName ?? null;
  if (!firstName && u.name) {
    const parts = u.name.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.slice(1).join(' ') || null;
  }
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    firstName,
    lastName,
    role: u.role as any,
  };
}

interface BruteForceRecord {
  failedAttempts: number;
  lockedUntil: number | null;
}

interface InMemorySession {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface InMemoryResetToken {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: number;
  usedAt: number | null;
}

interface StoredOtp {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

@Injectable()
export class AuthService {
  // Brute-force hesap kilitleme ve bellek-içi yedek oturum/parola sıfırlama depoları
  private readonly lockoutMap = new Map<string, BruteForceRecord>();
  private readonly memoryUsers = new Map<string, User>();
  private readonly memorySessions = new Map<string, InMemorySession>();
  private readonly memoryResetTokens = new Map<string, InMemoryResetToken>();
  private readonly otpMap = new Map<string, StoredOtp>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsProvider,
    private readonly social: SocialVerifier,
  ) {}

  // ---------- Brute-Force Koruması ----------
  private checkAccountLockout(email: string) {
    const record = this.lockoutMap.get(email);
    if (!record || !record.lockedUntil) return;
    if (Date.now() < record.lockedUntil) {
      const waitMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
      throw new AppDomainError(
        ErrorCode.AUTH_ACCOUNT_LOCKED,
        `Çok sayıda başarısız deneme nedeniyle hesabınız geçici olarak kilitlendi. Lütfen ${waitMinutes} dakika sonra tekrar deneyin.`,
        429,
        { waitMinutes },
      );
    }
    this.lockoutMap.delete(email);
  }

  private recordFailedLogin(email: string) {
    const record = this.lockoutMap.get(email) ?? { failedAttempts: 0, lockedUntil: null };
    record.failedAttempts += 1;
    if (record.failedAttempts >= LOCKOUT_MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    this.lockoutMap.set(email, record);
  }

  private clearFailedLogin(email: string) {
    this.lockoutMap.delete(email);
  }

  // ---------- Kayıt & Giriş ----------
  async register(input: RegisterInput, ua?: string) {
    const passwordHash = hashPasswordMemoryHard(input.password);
    const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null;

    if (!this.prisma.isConnected) {
      for (const u of this.memoryUsers.values()) {
        if (u.email === input.email || (input.phone && u.phone === input.phone)) {
          throw new ConflictException('Bu e-posta veya telefon ile kayıtlı bir hesap var');
        }
      }
      const now = new Date();
      const user: User = {
        id: `usr_${randomBytes(8).toString('hex')}`,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        name: fullName,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        tcIdentityEnc: null,
        role: Role.CUSTOMER,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      this.memoryUsers.set(user.id, user);
      return this.session(user, ua);
    }

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] },
    });
    if (exists) throw new ConflictException('Bu e-posta veya telefon ile kayıtlı bir hesap var');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        name: fullName,
        passwordHash,
      },
    });
    return this.session(user, ua);
  }

  async login(input: LoginInput, ua?: string) {
    this.checkAccountLockout(input.email);

    let user: User | null = null;
    if (!this.prisma.isConnected) {
      for (const u of this.memoryUsers.values()) {
        if (u.email === input.email) {
          user = u;
          break;
        }
      }
    } else {
      user = await this.prisma.user.findUnique({ where: { email: input.email } });
    }

    const ok = await verifyPasswordMemoryHard(input.password, user?.passwordHash);
    if (!user || !ok || user.deletedAt) {
      this.recordFailedLogin(input.email);
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    this.clearFailedLogin(input.email);
    return this.session(user, ua);
  }

  // ---------- Parola Sıfırlama Akışı ----------
  async requestPasswordReset(input: ForgotPasswordInput): Promise<{ sent: boolean; resetTokenPreview?: string }> {
    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = sha256(rawToken);

    let user: User | null = null;
    if (!this.prisma.isConnected) {
      for (const u of this.memoryUsers.values()) {
        if (u.email === input.email && !u.deletedAt) {
          user = u;
          break;
        }
      }
    } else {
      user = await this.prisma.user.findUnique({ where: { email: input.email } });
    }

    if (user && !user.deletedAt) {
      this.memoryResetTokens.set(tokenHash, {
        tokenHash,
        userId: user.id,
        email: input.email,
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        usedAt: null,
      });
    }

    return {
      sent: true,
      ...(process.env.NODE_ENV !== 'production' && user ? { resetTokenPreview: rawToken } : {}),
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ reset: boolean }> {
    const tokenHash = sha256(input.token);
    const stored = this.memoryResetTokens.get(tokenHash);
    if (!stored || stored.usedAt !== null || stored.expiresAt < Date.now()) {
      throw new AppDomainError(
        ErrorCode.AUTH_RESET_TOKEN_INVALID,
        'Parola sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
        400,
      );
    }

    stored.usedAt = Date.now();
    const newHash = hashPasswordMemoryHard(input.newPassword);

    if (!this.prisma.isConnected) {
      const user = this.memoryUsers.get(stored.userId);
      if (user) {
        user.passwordHash = newHash;
        user.updatedAt = new Date();
      }
      await this.logoutAll(stored.userId);
      return { reset: true };
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.clearFailedLogin(stored.email);
    return { reset: true };
  }

  // ---------- SMS OTP ----------
  async requestOtp(phone: string) {
    const recent = this.otpMap.get(phone);
    if (recent && Date.now() - recent.createdAt < OTP_RESEND_WINDOW_MS) {
      throw new HttpException('Yeni kod için lütfen 1 dakika bekleyin', HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.otpMap.set(phone, {
      codeHash: sha256(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      createdAt: Date.now(),
    });
    await this.sms.send(phone, `Aduva Garaj doğrulama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`);
    return { sent: true, expiresInSec: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(phone: string, code: string, ua?: string) {
    const otp = this.otpMap.get(phone);
    if (!otp || otp.expiresAt < Date.now() || otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Kod geçersiz veya süresi doldu');
    }
    if (otp.codeHash !== sha256(code)) {
      otp.attempts += 1;
      throw new UnauthorizedException('Kod hatalı');
    }
    this.otpMap.delete(phone);

    let user: User | null = null;
    if (this.prisma.isConnected) {
      user = await this.prisma.user.findUnique({ where: { phone } });
      const isNew = !user;
      if (!user) user = await this.prisma.user.create({ data: { phone } });
      if (user.deletedAt) throw new UnauthorizedException('Hesap silinmiş');
      return { ...(await this.session(user, ua)), isNew };
    } else {
      for (const u of this.memoryUsers.values()) {
        if (u.phone === phone) {
          user = u;
          break;
        }
      }
      const isNew = !user;
      if (!user) {
        const now = new Date();
        user = {
          id: `usr_${randomBytes(8).toString('hex')}`,
          email: null,
          phone,
          passwordHash: null,
          name: null,
          firstName: null,
          lastName: null,
          tcIdentityEnc: null,
          role: Role.CUSTOMER,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        this.memoryUsers.set(user.id, user);
      }
      return { ...(await this.session(user!, ua)), isNew };
    }
  }

  // ---------- Sosyal Giriş ----------
  async socialLogin(
    provider: 'google' | 'apple',
    idToken: string,
    names: { firstName?: string; lastName?: string },
    ua?: string,
  ) {
    const profile = await this.social.verify(provider, idToken);
    const fullName = [names.firstName, names.lastName].filter(Boolean).join(' ') || null;

    let user: User | null = null;
    if (this.prisma.isConnected) {
      user = profile.email ? await this.prisma.user.findUnique({ where: { email: profile.email } }) : null;
      if (!user) {
        user = await this.prisma.user.create({
          data: { email: profile.email, name: fullName },
        });
      }
      if (user.deletedAt) throw new UnauthorizedException('Hesap silinmiş');
      return this.session(user, ua);
    } else {
      for (const u of this.memoryUsers.values()) {
        if (profile.email && u.email === profile.email) {
          user = u;
          break;
        }
      }
      if (!user) {
        const now = new Date();
        user = {
          id: `usr_${randomBytes(8).toString('hex')}`,
          email: profile.email ?? null,
          phone: null,
          passwordHash: null,
          name: fullName,
          firstName: names.firstName ?? null,
          lastName: names.lastName ?? null,
          tcIdentityEnc: null,
          role: Role.CUSTOMER,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        this.memoryUsers.set(user.id, user);
      }
      return this.session(user!, ua);
    }
  }

  // ---------- Token ve Cihaz Oturum Yönetimi ----------
  async refresh(refreshToken: string, ua?: string) {
    const hash = sha256(refreshToken);

    if (!this.prisma.isConnected) {
      const mem = this.memorySessions.get(hash);
      if (!mem || new Date(mem.expiresAt) < new Date()) {
        throw new UnauthorizedException('Oturum geçersiz');
      }
      if (mem.revokedAt) {
        await this.logoutAll(mem.userId);
        throw new UnauthorizedException('Oturum geçersiz (Token tekrar kullanımı tespit edildi)');
      }
      mem.revokedAt = new Date().toISOString();
      const user = this.memoryUsers.get(mem.userId);
      if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
      return this.session(user, ua);
    }

    const stored = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Oturum geçersiz');
    if (stored.revokedAt) {
      await this.prisma.userSession.updateMany({ where: { userId: stored.userId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Oturum geçersiz');
    }
    await this.prisma.userSession.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.session(stored.user, ua);
  }

  async logout(refreshToken: string) {
    const hash = sha256(refreshToken);
    if (!this.prisma.isConnected) {
      const mem = this.memorySessions.get(hash);
      if (mem && !mem.revokedAt) mem.revokedAt = new Date().toISOString();
      return { ok: true };
    }
    await this.prisma.userSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async logoutAll(userId: string): Promise<{ ok: boolean; revokedCount: number }> {
    if (!this.prisma.isConnected) {
      let revokedCount = 0;
      for (const sess of this.memorySessions.values()) {
        if (sess.userId === userId && !sess.revokedAt) {
          sess.revokedAt = new Date().toISOString();
          revokedCount += 1;
        }
      }
      return { ok: true, revokedCount };
    }
    const result = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true, revokedCount: result.count };
  }

  async listActiveSessions(userId: string) {
    if (!this.prisma.isConnected) {
      return Array.from(this.memorySessions.values())
        .filter((s) => s.userId === userId && !s.revokedAt && new Date(s.expiresAt) > new Date())
        .map((s) => ({
          id: s.id,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        }));
    }
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async me(userId: string) {
    if (!this.prisma.isConnected) {
      const u = this.memoryUsers.get(userId);
      if (!u) throw new UnauthorizedException('Kullanıcı bulunamadı');
      return toPublicUser(u);
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toPublicUser(user);
  }

  /** Hesap silme (App Store / Google Play + KVKK): kişisel veriler anonimleştirilir. */
  async deleteAccount(userId: string) {
    if (!this.prisma.isConnected) {
      const u = this.memoryUsers.get(userId);
      if (u) {
        u.email = null;
        u.phone = null;
        u.name = null;
        u.passwordHash = null;
        u.deletedAt = new Date();
      }
      await this.logoutAll(userId);
      return { deleted: true };
    }

    await this.prisma.$transaction([
      this.prisma.userSession.deleteMany({ where: { userId } }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.userVehicle.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.cart.deleteMany({ where: { userId } }),
      this.prisma.order.updateMany({ where: { userId }, data: { userId: null } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: null,
          phone: null,
          name: null,
          passwordHash: null,
          deletedAt: new Date(),
        },
      }),
    ]);
    return { deleted: true };
  }

  private async session(user: User, ua?: string): Promise<AuthTokens & { user: PublicUser }> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'aduva-garaj-dev-hmac-secret-key-2026',
        expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
      },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    const expiresAt = new Date(Date.now() + days * 86400_000);
    const tokenHash = sha256(refreshToken);

    if (!this.prisma.isConnected) {
      this.memorySessions.set(tokenHash, {
        id: `sess_${randomBytes(6).toString('hex')}`,
        userId: user.id,
        tokenHash,
        userAgent: ua?.slice(0, 200) ?? 'unknown',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        revokedAt: null,
      });
    } else {
      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: tokenHash,
          expiresAt,
          userAgent: ua?.slice(0, 200),
        },
      });
    }
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
