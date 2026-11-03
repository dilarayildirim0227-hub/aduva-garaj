import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  PipeTransform,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ZodSchema } from 'zod';

const DEFAULT_DEV_JWT_SECRET = 'aduva-garaj-dev-hmac-sha256-secret-key-2026';

export function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL_SECURITY_ERROR: JWT_ACCESS_SECRET ortam değişkeni üretim ortamında zorunludur.');
  }
  return secret || DEFAULT_DEV_JWT_SECRET;
}

/** Bağımsız HMAC-SHA256 JWT imzalama yardımcısı (HS256 uyumlu) */
export function signHmacJwt(
  payload: JwtPayload & { exp?: number; iat?: number },
  secret: string = getJwtSecret(),
  expiresInSec = 3600,
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: payload.iat ?? nowSec,
      exp: payload.exp ?? nowSec + expiresInSec,
    }),
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/** Bağımsız HMAC-SHA256 JWT doğrulama yardımcısı (SEC-01 IDOR / sahte başlık önleme) */
export function verifyHmacJwt(token: string, secret: string = getJwtSecret()): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  const expectedSig = createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest('base64url');
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    if (parsed.exp && Math.floor(Date.now() / 1000) > Number(parsed.exp)) {
      return null;
    }
    if (!parsed.sub || !parsed.role) return null;
    return { sub: String(parsed.sub), role: parsed.role };
  } catch {
    return null;
  }
}

/** zod ile girdi doğrulama — hataları Türkçe alan bazında döner */
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Girilen bilgiler geçersiz',
        errors: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

export interface JwtPayload {
  sub: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OPERATIONS' | 'STAFF';
}

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const ROLES = 'roles';
export const Roles = (...roles: JwtPayload['role'][]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => ctx.switchToHttp().getRequest().user,
);

/** Global guard: @Public() olmayan tüm uç noktalar access token ister; @Roles() rol kontrolü yapar */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        req.user = this.jwt
          ? await this.jwt.verifyAsync<JwtPayload>(token, { secret: getJwtSecret() })
          : verifyHmacJwt(token, getJwtSecret());
        if (!req.user) throw new Error('INVALID_TOKEN');
      } catch {
        if (!isPublic) throw new UnauthorizedException('Oturum süresi doldu veya geçersiz erişim anahtarı');
      }
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Giriş yapmalısınız');

    const roles = this.reflector.getAllAndOverride<JwtPayload['role'][]>(ROLES, targets);
    if (roles?.length && !roles.includes(req.user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }
    return true;
  }
}
