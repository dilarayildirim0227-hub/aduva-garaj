import { PrismaService } from '../src/common/prisma';
import { signHmacJwt } from '../src/common/security';
import { CartController } from '../src/modules/cart/cart.controller';
import { CartRepository, LocalN11StockProvider } from '../src/modules/cart/cart.repository';
import { CartService } from '../src/modules/cart/cart.service';
import { CartDomainException } from '../src/modules/cart/cart.types';

describe('Aduva Garaj - Sepet Modülü Test Paketi (7 Kriter)', () => {
  let prisma: PrismaService;
  let repo: CartRepository;
  let stockProvider: LocalN11StockProvider;
  let service: CartService;
  let controller: CartController;

  beforeEach(() => {
    prisma = new PrismaService();
    stockProvider = new LocalN11StockProvider(prisma);
    repo = new CartRepository(prisma);
    service = new CartService(repo, stockProvider, prisma);
    controller = new CartController(service);
  });

  // 1. Stoktan fazla ekleme reddedilir
  it('1) Stoktan fazla ürün eklemeyi 409 OUT_OF_STOCK ve Türkçe mesajla reddeder', async () => {
    // prd-3 stok = 8
    await expect(
      controller.addItem(
        {},
        { 'x-cart-token': 'gst_test_stock' },
        { productId: 'prd-3', quantity: 9 },
        {},
      ),
    ).rejects.toThrow(CartDomainException);

    try {
      await controller.addItem(
        {},
        { 'x-cart-token': 'gst_test_stock' },
        { productId: 'prd-3', quantity: 9 },
        {},
      );
    } catch (err: any) {
      expect(err.getStatus()).toBe(409);
      const body = err.getResponse();
      expect(body.error.code).toBe('OUT_OF_STOCK');
      expect(body.error.message).toContain('stok');
    }
  });

  // 2. Aynı ürünü iki kez ekleme tek satırda miktarı artırır
  it('2) Aynı ürünü iki kez eklediğinde yeni satır açmaz, mevcut satırda miktarı artırır', async () => {
    const headers = { 'x-cart-token': 'gst_same_item' };

    const first = await controller.addItem({}, headers, { productId: 'prd-2', quantity: 2 }, {});
    expect(first.items).toHaveLength(1);
    expect(first.items[0].quantity).toBe(2);

    const second = await controller.addItem({}, headers, { productId: 'prd-2', quantity: 3 }, {});
    expect(second.items).toHaveLength(1);
    expect(second.items[0].quantity).toBe(5);
    expect(second.itemCount).toBe(5);
  });

  // 3. Misafir sepeti girişte doğru birleşir (stok sınırı aşılmaz)
  it('3) Giriş yapıldığında misafir sepetini kullanıcı sepetiyle birleştirir ve stok sınırını aşmaz', async () => {
    const guestToken = 'gst_merge_token';
    const userId = 'usr_customer_42';
    const userJwt = signHmacJwt({ sub: userId, role: 'CUSTOMER' });

    // Misafir sepetine prd-3 (stok: 8) 5 adet ve prd-4 2 adet ekle
    await controller.addItem({}, { 'x-cart-token': guestToken }, { productId: 'prd-3', quantity: 5 }, {});
    await controller.addItem({}, { 'x-cart-token': guestToken }, { productId: 'prd-4', quantity: 2 }, {});

    // Kullanıcının mevcut sepetinde prd-3 zaten 6 adet olsun (Doğrulanmış JWT ile)
    await controller.addItem({}, { authorization: `Bearer ${userJwt}` }, { productId: 'prd-3', quantity: 6 }, {});

    // Birleştir: 6 + 5 = 11 ama prd-3 stoğu 8 olduğu için 8'de tavan yapmalı
    const merged = await controller.mergeCart(
      {},
      { authorization: `Bearer ${userJwt}`, 'x-cart-token': guestToken },
      { userId, guestToken },
      {},
    );

    expect(merged.items).toHaveLength(2);
    const prd3Line = merged.items.find((i) => i.productId === 'prd-3')!;
    const prd4Line = merged.items.find((i) => i.productId === 'prd-4')!;
    expect(prd3Line.quantity).toBe(8); // stok sınırı (8) aşılmadı
    expect(prd4Line.quantity).toBe(2);
  });

  // 4. Fiyat değişimi uyarısı, araç uyumluluk uyarısı ve stok dışı (unavailable) davranışı
  it('4) Ürün fiyatı değiştiğinde priceChanged: true ve uyumsuz araçta fitmentWarning: true döner', async () => {
    const headers = { 'x-cart-token': 'gst_price_change' };

    // prd-2 sadece veh-golf7 ile uyumludur; veh-clio5 gönderildiğinde fitmentWarning: true olmalı
    const initial = await controller.addItem(
      {},
      headers,
      { productId: 'prd-2', quantity: 1, vehicleId: 'veh-clio5' },
      {},
    );
    expect(initial.items[0].priceChanged).toBe(false);
    expect(initial.items[0].fitmentWarning).toBe(true);

    // Ürün fiyatını güncelle (1249 TL -> 1399 TL)
    const p2 = prisma.store.products.find((p) => p.id === 'prd-2')!;
    p2.price = 1399;

    const updated = await controller.getCart({}, headers, {});
    expect(updated.items[0].priceChanged).toBe(true);
    expect(updated.items[0].unitPriceSnapshot).toBe(124900);
    expect(updated.items[0].unitPrice).toBe(139900);

    // Ürün pasife alındığında unavailable: true olur ve toplamdan çıkarılır
    p2.status = 'PASSIVE';
    const afterPassive = await controller.getCart({}, headers, {});
    expect(afterPassive.items[0].unavailable).toBe(true);
    expect(afterPassive.subtotal).toBe(0);
  });

  // 5. Geçersiz, süresi dolmuş ve minimum tutar altı kupon reddedilir
  it('5) Geçersiz, süresi dolmuş ve alt limit altı kuponları doğru hata kodlarıyla reddeder', async () => {
    const headers = { 'x-cart-token': 'gst_coupon_test' };
    // prd-4 = 649 TL (64900 kuruş)
    await controller.addItem({}, headers, { productId: 'prd-4', quantity: 1 }, {});

    // a) Geçersiz kupon -> INVALID_COUPON
    await expect(
      controller.applyCoupon({}, headers, { code: 'YOKBOYLEKUPON' }, {}),
    ).rejects.toMatchObject({
      code: 'INVALID_COUPON',
    });

    // b) Süresi dolmuş kupon -> COUPON_EXPIRED
    await expect(
      controller.applyCoupon({}, headers, { code: 'SURESIDOLMUS' }, {}),
    ).rejects.toMatchObject({
      code: 'COUPON_EXPIRED',
    });

    // c) Minimum sepet tutarı sağlanmayan kupon (GARAJ150 min 1500 TL) -> MIN_TOTAL_NOT_MET
    await expect(
      controller.applyCoupon({}, headers, { code: 'GARAJ150' }, {}),
    ).rejects.toMatchObject({
      code: 'MIN_TOTAL_NOT_MET',
    });

    // d) Geçerli kupon (HOSGELDIN %10, min 500 TL)
    const withCoupon = await controller.applyCoupon({}, headers, { code: 'HOSGELDIN' }, {});
    expect(withCoupon.coupon?.code).toBe('HOSGELDIN');
    expect(withCoupon.discount).toBe(6490); // 64900 * %10 = 6490 kuruş
  });

  // 6. 20 paralel istekte stok negatife düşmez / stok sınırı aşılmaz
  it('6) 20 paralel sepete ekleme isteğinde yarış durumunu önler ve stok sınırını aşmaz', async () => {
    const headers = { 'x-cart-token': 'gst_parallel_20' };
    // prd-3 stoğunu 5 olarak ayarla
    const p3 = prisma.store.products.find((p) => p.id === 'prd-3')!;
    p3.stock = 5;

    // Aynı anda 20 paralel istek (her biri 1 adet eklemeye çalışıyor)
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        controller.addItem({}, headers, { productId: 'prd-3', quantity: 1 }, {}),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(15);

    const finalCart = await controller.getCart({}, headers, {});
    const item = finalCart.items.find((i) => i.productId === 'prd-3')!;
    expect(item.quantity).toBe(5);
    expect(p3.stock - item.quantity).toBeGreaterThanOrEqual(0);
  });

  // 7. Toplam hesaplamalarında (kuruş integer, KDV, kargo) yuvarlama hatası yoktur
  it('7) Tüm tutar hesaplamalarını kuruş cinsinden tam sayı (integer) yapar, yuvarlama hatası oluşmaz', async () => {
    const headers = { 'x-cart-token': 'gst_math_precision' };
    // prd-4 = 64900 kuruş (649 TL). Ücretsiz kargo eşiği = 75000 kuruş (750 TL)
    const cart1 = await controller.addItem({}, headers, { productId: 'prd-4', quantity: 1 }, {});

    expect(Number.isInteger(cart1.subtotal)).toBe(true);
    expect(Number.isInteger(cart1.shipping)).toBe(true);
    expect(Number.isInteger(cart1.tax)).toBe(true);
    expect(Number.isInteger(cart1.total)).toBe(true);
    expect(Number.isInteger(cart1.freeShippingRemaining)).toBe(true);

    expect(cart1.subtotal).toBe(64900);
    expect(cart1.freeShippingRemaining).toBe(10100); // 75000 - 64900 = 10100 kuruş (101 TL)
    expect(cart1.shipping).toBe(7990); // 79.90 TL
    expect(cart1.total).toBe(72890); // 64900 + 7990 = 72890 kuruş
    expect(cart1.tax).toBe(Math.round((72890 * 20) / 120)); // %20 iç KDV = 12148 kuruş
  });

  // 8. SEC-01 & SEC-03 & SEC-04: Güvenlik denetimi düzeltmeleri (IDOR, Idempotency Payload Hash, CSRF)
  it('8) SEC-01/SEC-03/SEC-04: İmzalanmamış X-User-Id (IDOR) ve farklı gövdeli Idempotency-Key reddedilir', async () => {
    // a) İmzalanmamış x-user-id ile erişim reddedilir (401 UNAUTHORIZED_USER)
    await expect(
      controller.getCart({}, { 'x-user-id': 'usr_victim_1' }, {}),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED_USER' });

    // b) Başka bir kullanıcının userId'si ile mergeCart çağrısı reddedilir (403 IDOR_FORBIDDEN)
    const attackerJwt = signHmacJwt({ sub: 'usr_attacker', role: 'CUSTOMER' });
    await expect(
      controller.mergeCart(
        {},
        { authorization: `Bearer ${attackerJwt}` },
        { userId: 'usr_victim_1', guestToken: 'gst_any' },
        {},
      ),
    ).rejects.toMatchObject({ code: 'IDOR_FORBIDDEN' });

    // c) Aynı Idempotency-Key ile farklı ürün/miktar gönderildiğinde 422 IDEMPOTENCY_PAYLOAD_MISMATCH döner
    const idempHeaders = { 'x-cart-token': 'gst_idemp_sec', 'idempotency-key': 'idem-key-100' };
    await controller.addItem({}, idempHeaders, { productId: 'prd-2', quantity: 1 }, {});
    await expect(
      controller.addItem({}, idempHeaders, { productId: 'prd-4', quantity: 3 }, {}),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });

    // d) Çerezde csrfToken varken X-CSRF-Token başlığı uyuşmuyorsa 403 CSRF_TOKEN_INVALID döner
    await expect(
      controller.addItem(
        {},
        { cookie: 'cartToken=gst_csrf; csrfToken=expected_token', 'x-csrf-token': 'wrong_token' },
        { productId: 'prd-2', quantity: 1 },
        {},
      ),
    ).rejects.toMatchObject({ code: 'CSRF_TOKEN_INVALID' });
  });
});
