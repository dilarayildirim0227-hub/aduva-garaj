import { JwtService } from '@nestjs/jwt';
import { AuthService, sha256 } from '../src/modules/auth/auth.service';

process.env.JWT_ACCESS_SECRET = 'test-secret';

/** Bellek içi basit Prisma taklidi (yalnızca testte kullanılan metodlar) */
function fakePrisma() {
  const otps: any[] = [];
  const users: any[] = [];
  const tokens: any[] = [];
  return {
    otps, users, tokens,
    otpCode: {
      findFirst: async ({ where }: any) =>
        otps.filter((o) => o.phone === where.phone && (!where.createdAt || o.createdAt > where.createdAt.gt) && (!where.expiresAt || o.expiresAt > where.expiresAt.gt)).at(-1) ?? null,
      create: async ({ data }: any) => { const o = { id: String(otps.length), attempts: 0, createdAt: new Date(), ...data }; otps.push(o); return o; },
      update: async ({ where, data }: any) => { const o = otps.find((x) => x.id === where.id); o.attempts += data.attempts.increment; return o; },
      deleteMany: async ({ where }: any) => { for (let i = otps.length - 1; i >= 0; i--) if (otps[i].phone === where.phone) otps.splice(i, 1); },
    },
    user: {
      findUnique: async ({ where }: any) => users.find((u) => (where.phone && u.phone === where.phone) || (where.email && u.email === where.email)) ?? null,
      create: async ({ data }: any) => { const u = { id: `u${users.length}`, role: 'CUSTOMER', email: null, firstName: null, lastName: null, deletedAt: null, ...data }; users.push(u); return u; },
    },
    refreshToken: { create: async ({ data }: any) => { tokens.push(data); return data; } },
  };
}

describe('AuthService OTP akışı', () => {
  const sent: string[] = [];
  const sms = { send: async (_p: string, m: string) => { sent.push(m); } };

  it('kod gönderir, doğru kodla kullanıcı oluşturur ve token döner', async () => {
    const prisma = fakePrisma();
    const svc = new AuthService(prisma as any, new JwtService(), sms as any, {} as any);

    await svc.requestOtp('5321234567');
    const code = sent.at(-1)!.match(/(\d{6})/)![1];
    expect(prisma.otps[0].codeHash).toBe(sha256(code));
    expect(prisma.otps[0].codeHash).not.toContain(code); // kod düz metin saklanmaz

    const res = await svc.verifyOtp('5321234567', code);
    expect(res.isNew).toBe(true);
    expect(res.accessToken).toBeTruthy();
    expect(prisma.tokens[0].tokenHash).toBe(sha256(res.refreshToken));
  });

  it('1 dakika içinde ikinci kod talebini reddeder', async () => {
    const svc = new AuthService(fakePrisma() as any, new JwtService(), sms as any, {} as any);
    await svc.requestOtp('5320000000');
    await expect(svc.requestOtp('5320000000')).rejects.toThrow('1 dakika');
  });

  it('hatalı kodu reddeder ve deneme sayısını artırır', async () => {
    const prisma = fakePrisma();
    const svc = new AuthService(prisma as any, new JwtService(), sms as any, {} as any);
    await svc.requestOtp('5329999999');
    await expect(svc.verifyOtp('5329999999', '000000')).rejects.toThrow();
    expect(prisma.otps[0].attempts).toBe(1);
  });
});
