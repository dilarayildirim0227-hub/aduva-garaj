import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SocialProfile {
  providerId: string;
  email?: string;
}

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/** Google / Apple idToken doğrulama (mobil SDK'dan gelen token) */
@Injectable()
export class SocialVerifier {
  private google = new OAuth2Client();

  async verify(provider: 'google' | 'apple', idToken: string): Promise<SocialProfile> {
    try {
      if (provider === 'google') {
        const audience = (process.env.GOOGLE_CLIENT_IDS ?? '').split(',').filter(Boolean);
        const ticket = await this.google.verifyIdToken({ idToken, audience });
        const p = ticket.getPayload();
        if (!p?.sub) throw new Error('payload yok');
        return { providerId: p.sub, email: p.email_verified ? p.email : undefined };
      }
      const { payload } = await jwtVerify(idToken, appleJwks, {
        issuer: 'https://appleid.apple.com',
        audience: process.env.APPLE_BUNDLE_ID,
      });
      return { providerId: String(payload.sub), email: payload.email as string | undefined };
    } catch {
      throw new UnauthorizedException('Sosyal giriş doğrulanamadı');
    }
  }
}
