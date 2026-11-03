import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getJwtSecret, Public, verifyHmacJwt } from '../../common/security';
import { CartIdentity, CartService } from './cart.service';
import {
  addCartItemSchema,
  applyCouponSchema,
  CartDomainException,
  CartView,
  updateCartItemSchema,
} from './cart.types';

const COOKIE_NAME = 'cartToken';
const CSRF_COOKIE_NAME = 'csrfToken';
const COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 gün
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX_REQ = 60; // dakikada 60 istek

@Public()
@Controller('cart')
export class CartController {
  private readonly idempotencyCache = new Map<
    string,
    { expiresAt: number; payloadHash: string; response: CartView }
  >();
  private readonly rateLimitBuckets = new Map<string, { resetAt: number; count: number }>();

  constructor(private readonly cartService: CartService) {}

  /**
   * SEC-01 Çözümü:
   * - İmzalanmamış `x-user-id` veya sahte `Bearer usr_...` başlıkları reddedilir.
   * - Kullanıcı kimliği yalnızca doğrulanmış HMAC-SHA256 JWT (`Authorization: Bearer <jwt>`),
   *   `req.user.sub` veya HMAC imzalı `x-user-id` + `x-user-signature` ile kabul edilir.
   */
  private resolveIdentity(req: any, headers: Record<string, string | undefined>): CartIdentity {
    let userId: string | null = req?.user?.sub || null;

    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const bearerVal = authHeader.slice(7).trim();
      const verified = verifyHmacJwt(bearerVal, getJwtSecret());
      if (!verified) {
        throw new CartDomainException(
          'UNAUTHORIZED_USER',
          'Geçersiz veya imzasız erişim anahtarı (JWT doğrulaması başarısız).',
          HttpStatus.UNAUTHORIZED,
        );
      }
      userId = verified.sub;
    }

    const rawUserIdHeader = headers['x-user-id'];
    if (!userId && rawUserIdHeader) {
      const sigHeader = headers['x-user-signature'] || '';
      const expectedSig = createHmac('sha256', getJwtSecret()).update(rawUserIdHeader).digest('hex');
      const a = Buffer.from(sigHeader);
      const b = Buffer.from(expectedSig);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new CartDomainException(
          'UNAUTHORIZED_USER',
          'Doğrulanmamış X-User-Id başlığı reddedildi (IDOR koruması). Lütfen geçerli bir Bearer JWT kullanın.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      userId = rawUserIdHeader;
    }

    // 2. Misafir cartToken: Cookie veya x-cart-token başlığı
    let token: string | null = headers['x-cart-token'] || null;
    const rawCookie = headers['cookie'] || req?.headers?.cookie || '';
    if (!token && typeof rawCookie === 'string') {
      const match = rawCookie
        .split(';')
        .map((p) => p.trim())
        .find((p) => p.startsWith(`${COOKIE_NAME}=`));
      if (match) {
        token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
      }
    }

    return { userId, token };
  }

  /**
   * SEC-04 Çözümü:
   * Çerez tabanlı mutasyon isteklerinde (POST/PATCH/DELETE) Double-Submit CSRF doğrulaması
   */
  private enforceCsrfProtection(req: any, headers: Record<string, string | undefined>) {
    const rawCookie = headers['cookie'] || req?.headers?.cookie || '';
    if (!rawCookie || typeof rawCookie !== 'string') return;
    const csrfCookieMatch = rawCookie
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${CSRF_COOKIE_NAME}=`));
    if (!csrfCookieMatch) return;

    const cookieCsrf = decodeURIComponent(csrfCookieMatch.slice(CSRF_COOKIE_NAME.length + 1));
    const headerCsrf = headers['x-csrf-token'] || headers['X-CSRF-Token'] || '';
    if (!headerCsrf || headerCsrf !== cookieCsrf) {
      throw new CartDomainException(
        'CSRF_TOKEN_INVALID',
        'CSRF doğrulama anahtarı eksik veya geçersiz (X-CSRF-Token uyuşmuyor).',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /** Yanıta httpOnly, secure, sameSite=lax cartToken çerezini ve x-request-id başlığını yazar */
  private applyHeadersAndCookie(res: any, token: string | null, reqId?: string) {
    if (!res || typeof res.header !== 'function') return;
    res.header('x-request-id', reqId || randomUUID());
    if (token) {
      const isProd = process.env.NODE_ENV === 'production';
      const cookieParts = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        `Max-Age=${COOKIE_MAX_AGE_SEC}`,
        'HttpOnly',
        'SameSite=Lax',
      ];
      if (isProd) cookieParts.push('Secure');
      res.header('Set-Cookie', cookieParts.join('; '));
      res.header('x-cart-token', token);
    }
  }

  /** Dakikada 60 istek sınırı (IP + cartToken bazlı) */
  private enforceRateLimit(req: any, identity: CartIdentity) {
    const ip = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    const key = `${ip}:${identity.userId || identity.token || 'anon'}`;
    const now = Date.now();
    const bucket = this.rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.rateLimitBuckets.set(key, { resetAt: now + RATE_LIMIT_WINDOW_MS, count: 1 });
      return;
    }
    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX_REQ) {
      throw new CartDomainException(
        'VALIDATION_ERROR',
        'Çok fazla sepet isteği gönderdiniz. Lütfen 1 dakika bekleyip tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
        { limitPerMinute: RATE_LIMIT_MAX_REQ },
      );
    }
  }

  @Get()
  async getCart(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: any,
  ) {
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);
    const { cart, token } = await this.cartService.getCart(identity);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: any,
  ) {
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);
    const { summary, token } = await this.cartService.getSummary(identity);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return summary;
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);

    // SEC-03 Çözümü: Idempotency-Key (24 saat) + SHA-256 istek gövdesi özeti (payloadHash) kontrolü
    const idempotencyKey = headers['idempotency-key'] || headers['Idempotency-Key'];
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(body ?? {}))
      .digest('hex');

    if (idempotencyKey) {
      const scopedKey = `${identity.userId || identity.token || 'anon'}:${idempotencyKey}`;
      const cached = this.idempotencyCache.get(scopedKey);
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.payloadHash !== payloadHash) {
          throw new CartDomainException(
            'IDEMPOTENCY_PAYLOAD_MISMATCH',
            'Aynı Idempotency-Key farklı bir istek gövdesiyle (payload) tekrar kullanılamaz.',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        this.applyHeadersAndCookie(res, identity.token ?? null, headers['x-request-id']);
        return cached.response;
      }
    }

    const parsed = addCartItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new CartDomainException(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Geçersiz sepet satırı verisi.',
        HttpStatus.BAD_REQUEST,
        { issues: parsed.error.issues },
      );
    }

    const { cart, token } = await this.cartService.addItem(identity, parsed.data);
    if (idempotencyKey) {
      const scopedKey = `${identity.userId || token || 'anon'}:${idempotencyKey}`;
      this.idempotencyCache.set(scopedKey, {
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        payloadHash,
        response: cart,
      });
    }

    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);

    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new CartDomainException(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Geçersiz miktar değeri.',
        HttpStatus.BAD_REQUEST,
        { issues: parsed.error.issues },
      );
    }

    const { cart, token } = await this.cartService.updateItemQuantity(identity, itemId, parsed.data);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Delete('items/:itemId')
  async removeItem(
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);
    const { cart, token } = await this.cartService.removeItem(identity, itemId);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Delete()
  async clearCart(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);
    const { cart, token } = await this.cartService.clearCart(identity);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  async applyCoupon(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);

    const parsed = applyCouponSchema.safeParse(body);
    if (!parsed.success) {
      throw new CartDomainException(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Geçersiz kupon kodu formatı.',
        HttpStatus.BAD_REQUEST,
        { issues: parsed.error.issues },
      );
    }

    const { cart, token } = await this.cartService.applyCoupon(identity, parsed.data);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Delete('coupon')
  async removeCoupon(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);
    const { cart, token } = await this.cartService.removeCoupon(identity);
    this.applyHeadersAndCookie(res, token, headers['x-request-id']);
    return cart;
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  async mergeCart(
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { userId?: string; guestToken?: string } | undefined,
    @Res({ passthrough: true }) res: any,
  ) {
    this.enforceCsrfProtection(req, headers);
    const identity = this.resolveIdentity(req, headers);
    this.enforceRateLimit(req, identity);

    // SEC-01 Çözümü: Sepet birleştirme yalnızca doğrulanmış oturum sahibinin kendi userId'si için yapılabilir
    if (!identity.userId) {
      throw new CartDomainException(
        'UNAUTHORIZED_USER',
        'Sepet birleştirme için doğrulanmış kullanıcı oturumu (Bearer JWT) gereklidir.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (body?.userId && body.userId !== identity.userId) {
      throw new CartDomainException(
        'IDOR_FORBIDDEN',
        'Başka bir kullanıcının sepetini birleştirme yetkiniz yok (IDOR engellendi).',
        HttpStatus.FORBIDDEN,
      );
    }

    const guestToken = body?.guestToken || identity.token;
    const { cart } = await this.cartService.mergeGuestCart(identity.userId, guestToken);
    this.applyHeadersAndCookie(res, null, headers['x-request-id']);
    return cart;
  }
}
