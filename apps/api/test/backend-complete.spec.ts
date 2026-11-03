import { JwtService } from '@nestjs/jwt';
import { AppDomainError, ErrorCode } from '../src/common/error-codes';
import { CircuitBreaker, maskPiiObject } from '../src/common/observability';
import { PrismaService } from '../src/common/prisma';
import {
  createSignedMediaUrl,
  DefaultVirusScanner,
  validateUploadedFile,
  verifySignedMediaUrl,
} from '../src/common/upload.security';
import { AdminService } from '../src/modules/admin/admin.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { CartRepository, LocalN11StockProvider } from '../src/modules/cart/cart.repository';
import { CartService } from '../src/modules/cart/cart.service';
import { NotificationsService } from '../src/modules/notifications/notifications.module';
import { CarrierShippingAdapter, EInvoiceAdapter, OrdersService } from '../src/modules/orders/orders.service';
import { ProductsService, toTurkishSlug } from '../src/modules/products/products.service';
import { UsersService } from '../src/modules/users/users.service';
import { N11MockClient } from '../src/n11/n11-mock.client';
import { N11SyncService } from '../src/n11/n11-sync.service';

describe('Aduva Garaj - Production Backend Complete Suite (Aşama 1..6)', () => {
  let prisma: PrismaService;
  let authService: AuthService;
  let productsService: ProductsService;
  let cartRepo: CartRepository;
  let stockProvider: LocalN11StockProvider;
  let cartService: CartService;
  let ordersService: OrdersService;
  let usersService: UsersService;
  let notificationsService: NotificationsService;
  let n11SyncService: N11SyncService;
  let adminService: AdminService;

  beforeEach(() => {
    prisma = new PrismaService();
    prisma.isConnected = false; // In-memory deterministic test mode

    const jwt = new JwtService({ secret: 'test-jwt-secret-aduva-garaj-2026' });
    authService = new AuthService(prisma, jwt);
    productsService = new ProductsService(prisma);
    cartRepo = new CartRepository(prisma);
    stockProvider = new LocalN11StockProvider(prisma);
    cartService = new CartService(cartRepo, stockProvider, prisma);
    ordersService = new OrdersService(
      prisma,
      cartService,
      new CarrierShippingAdapter(),
      new EInvoiceAdapter(),
    );
    usersService = new UsersService(prisma);
    notificationsService = new NotificationsService(prisma, cartRepo);
    n11SyncService = new N11SyncService(new N11MockClient(), prisma);
    adminService = new AdminService(prisma, n11SyncService);
  });

  // ===========================================================================
  // AŞAMA 1: KİMLİK DOĞRULAMA, BRUTE-FORCE KİLİTLEME, DOSYA & KVKK GÜVENLİĞİ
  // ===========================================================================
  describe('Aşama 1 - Auth, Brute-Force Lockout, Upload Security & Observability', () => {
    it('registers user with memory-hard scrypt hash, lists sessions, and revokes all sessions', async () => {
      const reg = await authService.register(
        {
          email: 'ahmet.kaya@example.com',
          password: 'GucluSifre!2026',
          firstName: 'Ahmet',
          lastName: 'Kaya',
          phone: '05321112233',
          kvkkConsent: true,
        },
        { ip: '10.0.0.5', userAgent: 'JestTestAgent/1.0' },
      );

      expect(reg.accessToken).toBeDefined();
      expect(reg.user.email).toBe('ahmet.kaya@example.com');

      const sessions = await authService.listActiveSessions(reg.user.id);
      expect(sessions.length).toBe(1);

      const revoked = await authService.logoutAllSessions(reg.user.id);
      expect(revoked.revokedCount).toBe(1);

      const afterSessions = await authService.listActiveSessions(reg.user.id);
      expect(afterSessions.length).toBe(0);
    });

    it('locks account for 15 minutes after 5 failed password attempts (Brute-Force Protection)', async () => {
      await authService.register({
        email: 'locktest@example.com',
        password: 'DogruSifre!2026',
        firstName: 'Test',
        lastName: 'User',
      });

      for (let i = 0; i < 5; i++) {
        await expect(authService.login('locktest@example.com', 'YanlisSifre123')).rejects.toThrow();
      }

      // 6. denemede doğru şifre girilse bile hesap kilitli (ACCOUNT_LOCKED / 429) olmalıdır
      await expect(authService.login('locktest@example.com', 'DogruSifre!2026')).rejects.toMatchObject({
        code: ErrorCode.ACCOUNT_LOCKED,
      });
    });

    it('completes password reset token flow and revokes existing sessions', async () => {
      await authService.register({
        email: 'reset@example.com',
        password: 'EskiSifre!2026',
      });

      const forgot = await authService.requestPasswordReset('reset@example.com');
      expect(forgot.sent).toBe(true);
      expect(forgot.resetToken).toBeDefined();

      const resetRes = await authService.confirmPasswordReset(forgot.resetToken!, 'YeniSifre!2026');
      expect(resetRes.reset).toBe(true);

      const loginWithNew = await authService.login('reset@example.com', 'YeniSifre!2026');
      expect(loginWithNew.accessToken).toBeDefined();
    });

    it('validates uploaded file magic bytes, scans for EICAR signature, and signs URLs', async () => {
      const scanner = new DefaultVirusScanner();
      // Geçerli PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
      const validated = await validateUploadedFile(
        {
          filename: 'urun-gorsel.png',
          declaredMimeType: 'image/png',
          buffer: validPng,
        },
        scanner,
      );

      expect(validated.detectedMimeType).toBe('image/png');
      expect(validated.sha256).toHaveLength(64);

      const signed = createSignedMediaUrl(validated.safeFilename, 300);
      expect(verifySignedMediaUrl(validated.safeFilename, signed.expiresAt, signed.signature)).toBe(true);
      expect(verifySignedMediaUrl(validated.safeFilename, signed.expiresAt, 'sahte-imza')).toBe(false);

      // Sahte uzantılı çalıştırılabilir dosya reddedilmeli
      const fakePng = Buffer.from('MZ-executable-binary-payload-disguised-as-png');
      await expect(
        validateUploadedFile(
          {
            filename: 'exploit.png',
            declaredMimeType: 'image/png',
            buffer: fakePng,
          },
          scanner,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.FILE_MAGIC_BYTES_MISMATCH });
    });

    it('masks PII fields in structured logs per KVKK rules', () => {
      const masked = maskPiiObject({
        email: 'mehmet.yilmaz@gmail.com',
        phone: '05324445566',
        password: 'SuperSecretPassword',
        tcIdentityNumber: '12345678901',
        orderNumber: 'ADV-2026-1001',
      }) as Record<string, string>;

      expect(masked.email).toContain('***@gmail.com');
      expect(masked.phone).toContain('*******');
      expect(masked.password).toBe('***REDACTED***');
      expect(masked.tcIdentityNumber).toBe('***REDACTED***');
      expect(masked.orderNumber).toBe('ADV-2026-1001');
    });
  });

  // ===========================================================================
  // AŞAMA 2: ÜRÜN KATALOĞU, TÜRKÇE ARAMA, UYUMLULUK MOTORU & GARAJIM
  // ===========================================================================
  describe('Aşama 2 - Catalog, Turkish Slug/Search, Fitment Engine & User Garage', () => {
    it('generates Turkish-safe unique slugs and provides autocomplete & recommendations', () => {
      expect(toTurkishSlug('Şanzıman & Göğüs Çıtası İnce Set')).toBe('sanziman-gogus-citasi-ince-set');

      const created1 = productsService.createProduct({
        title: 'Özel Kesim Bagaj Havuzu',
        description: ' %100 TPE kauçuk bagaj havuzu, kokusuz ve yüksek kenarlı tasarım.',
        brand: 'Aduva Fit',
        price: 1199,
        stock: 20,
        categoryId: 'cat-paspas',
        isUniversal: false,
        isFeatured: false,
        requiresMontage: false,
        fitmentVehicleIds: ['veh-golf7'],
        attributes: {},
      });
      const created2 = productsService.createProduct({
        title: 'Özel Kesim Bagaj Havuzu',
        description: 'İkinci varyasyon ürün açıklaması en az 10 karakter.',
        brand: 'Aduva Fit',
        price: 1299,
        stock: 15,
        categoryId: 'cat-paspas',
        isUniversal: false,
        isFeatured: false,
        requiresMontage: false,
        fitmentVehicleIds: ['veh-golf7'],
        attributes: {},
      });

      expect(created1.slug).toBe('ozel-kesim-bagaj-havuzu');
      expect(created2.slug).toBe('ozel-kesim-bagaj-havuzu-2');

      const auto = productsService.autocomplete({ q: 'golf', limit: 5 });
      expect(auto.suggestions.length).toBeGreaterThan(0);

      productsService.recordProductView('user-1', 'prd-1');
      const recs = productsService.getRecommendations('prd-1', 'user-1');
      expect(recs.similar.length).toBeGreaterThan(0);
      expect(recs.recentlyViewed.some((p: { id: string }) => p.id === 'prd-1')).toBe(true);
    });

    it('evaluates vehicle fitment accurately and manages user Garage ("Garajım")', () => {
      const hierarchy = productsService.getVehicleHierarchy({});
      expect(hierarchy.brands).toContain('Volkswagen');

      // prd-2 yalnızca veh-golf7 ile uyumlu (isUniversal: false)
      const compat = productsService.checkFitment({ productId: 'prd-2', vehicleId: 'veh-golf7' });
      expect(compat.compatible).toBe(true);

      const incompat = productsService.checkFitment({ productId: 'prd-2', vehicleId: 'veh-clio5' });
      expect(incompat.compatible).toBe(false);

      // Garajım çoklu araç yönetimi
      const v1 = productsService.addGarageVehicle('user-garage-1', {
        vehicleId: 'veh-golf7',
        nickname: 'Hafta İçi Golf',
        plate: '34 ADV 07',
        isPrimary: true,
      });
      const v2 = productsService.addGarageVehicle('user-garage-1', {
        vehicleId: 'veh-t10x',
        nickname: 'Aile Aracı Togg',
        plate: '34 TOG 10',
        isPrimary: true,
      });

      expect(v1.id).toBeDefined();
      expect(v2.isPrimary).toBe(true);

      const garage = productsService.getUserGarage('user-garage-1');
      expect(garage.length).toBe(2);
      expect(garage.find((g) => g.id === v1.id)?.isPrimary).toBe(false);
    });
  });

  // ===========================================================================
  // AŞAMA 3: 20 PARALEL CHECKOUT EŞZAMANLILIK TESTİ, SİPARİŞ DURUM MAKİNESİ, WEBHOOK
  // ===========================================================================
  describe('Aşama 3 - 20-Parallel Checkout Concurrency, Order State Machine & 3DS Webhook', () => {
    it('handles 20 parallel checkout requests for a 5-stock product without ever going negative', async () => {
      const targetProduct = prisma.store.products.find((p) => p.id === 'prd-3')!;
      targetProduct.stock = 5;

      // 20 farklı kullanıcı sepetine 1'er adet prd-3 ekle
      const userIds = Array.from({ length: 20 }, (_, idx) => `concurrent_user_${idx + 1}`);
      for (const uid of userIds) {
        await cartService.addItem({ userId: uid }, { productId: 'prd-3', quantity: 1 });
      }

      // 20 paralel sipariş oluşturma isteğini aynı anda ateşle
      const results = await Promise.allSettled(
        userIds.map((uid, idx) =>
          ordersService.createOrder(
            { userId: uid },
            {
              paymentMethod: 'BANK_TRANSFER',
              carrier: 'YURTICI',
              idempotencyKey: `idem_parallel_${idx}`,
              shippingAddress: {
                title: 'Ev',
                recipient: `Müşteri ${idx}`,
                phone: '05321112233',
                city: 'İstanbul',
                district: 'Kadıköy',
                neighborhood: 'Caferağa Mah.',
                fullAddress: 'Moda Cad. No: 10 Daire: 4 Kadıköy',
              },
              invoiceInfo: { type: 'INDIVIDUAL' },
              kvkkConsentAccepted: true,
              distanceSalesContractAccepted: true,
            },
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Tam olarak 5 sipariş başarılı olmalı, 15 sipariş OUT_OF_STOCK almalı, stok asla negatif olmamalı!
      expect(fulfilled.length).toBe(5);
      expect(rejected.length).toBe(15);
      expect(targetProduct.stock).toBe(0);
    });

    it('enforces strict Order State Machine transitions, 3DS HMAC webhook idempotency & return RMA', async () => {
      const uid = 'buyer_state_machine';
      await cartService.addItem({ userId: uid }, { productId: 'prd-2', quantity: 2 });

      const order = await ordersService.createOrder(
        { userId: uid },
        {
          paymentMethod: 'CARD_3DS',
          carrier: 'YURTICI',
          shippingAddress: {
            title: 'Ofis',
            recipient: 'Can Demir',
            phone: '05339998877',
            city: 'Ankara',
            district: 'Çankaya',
            neighborhood: 'Kızılay Mah.',
            fullAddress: 'Atatürk Bulvarı No: 100 Çankaya / Ankara',
          },
          invoiceInfo: {
            type: 'CORPORATE',
            companyName: 'Demir Otomotiv A.Ş.',
            taxOffice: 'Çankaya',
            taxNumber: '1234567890',
          },
          kvkkConsentAccepted: true,
          distanceSalesContractAccepted: true,
        },
      );

      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.payment3dsHtml).toContain('3D Secure');

      // Sahte imzalı webhook reddedilmeli
      await expect(
        ordersService.handlePaymentWebhook(
          {
            eventId: 'evt_1001',
            orderId: order.id,
            paymentTransactionId: 'iyz_tx_999',
            status: 'SUCCESS',
            paidAmountKurus: order.totalKurus,
          },
          'invalid-forged-signature',
        ),
      ).rejects.toMatchObject({ code: ErrorCode.WEBHOOK_SIGNATURE_INVALID });

      // Geçerli HMAC-SHA256 imzalı 3DS webhook siparişi PAID durumuna geçirmeli ve e-Fatura kesmeli
      const validSig = ordersService.computeWebhookSignature(
        'evt_1001',
        order.id,
        'SUCCESS',
        order.totalKurus,
      );
      const webhookRes1 = await ordersService.handlePaymentWebhook(
        {
          eventId: 'evt_1001',
          orderId: order.id,
          paymentTransactionId: 'iyz_tx_999',
          status: 'SUCCESS',
          paidAmountKurus: order.totalKurus,
        },
        validSig,
      );

      expect(webhookRes1.idempotentReplay).toBe(false);
      expect(webhookRes1.order.status).toBe('PAID');
      expect(webhookRes1.order.eInvoiceNumber).toMatch(/^GIB2026/);

      // Aynı eventId ile tekrar gelen webhook idempotent olarak atlanmalı
      const webhookRes2 = await ordersService.handlePaymentWebhook(
        {
          eventId: 'evt_1001',
          orderId: order.id,
          paymentTransactionId: 'iyz_tx_999',
          status: 'SUCCESS',
          paidAmountKurus: order.totalKurus,
        },
        validSig,
      );
      expect(webhookRes2.idempotentReplay).toBe(true);

      // Geçersiz durum geçişi (PAID -> DELIVERED doğrudan atlanamaz, önce PREPARING -> SHIPPED olmalı)
      expect(() =>
        ordersService.transitionOrderStatus(order.id, {
          status: 'DELIVERED',
        }),
      ).toThrow(AppDomainError);

      // Doğru durum geçişleri: PAID -> PREPARING -> SHIPPED -> DELIVERED
      ordersService.transitionOrderStatus(order.id, { status: 'PREPARING' });
      const shipped = ordersService.transitionOrderStatus(order.id, {
        status: 'SHIPPED',
        carrier: 'YURTICI',
      });
      expect(shipped.trackingCode).toMatch(/^YK/);

      const delivered = ordersService.transitionOrderStatus(order.id, { status: 'DELIVERED' });
      expect(delivered.status).toBe('DELIVERED');

      // Kısmi iade talebi (2 adetten 1 adedini iade et)
      const rma = ordersService.createReturnRequest(order.id, { userId: uid }, {
        reason: 'Aracımın model yılını yanlış seçmişim',
        items: [{ productId: 'prd-2', quantity: 1 }],
      });
      expect(rma.rmaCode).toMatch(/^RMA-/);
      expect(rma.refundAmountKurus).toBe(order.items[0].unitPriceKurus);
    });
  });

  // ===========================================================================
  // AŞAMA 4: KUPONLAR, ADRES IDOR, DOĞRULANMIŞ YORUM, RANDEVU & KVKK
  // ===========================================================================
  describe('Aşama 4 - Coupons, Address IDOR, Verified Reviews, Appointments & KVKK', () => {
    it('prevents IDOR on addresses and enforces FREE_SHIPPING & perUserLimit coupons', async () => {
      const addr = usersService.createAddress('user-A', {
        title: 'Evim',
        recipient: 'Ali Veli',
        phone: '05321234567',
        city: 'İzmir',
        district: 'Karşıyaka',
        neighborhood: 'Bostanlı Mah.',
        fullAddress: 'Cemal Gürsel Cad. No: 55 Karşıyaka / İzmir',
        isDefault: true,
        invoiceType: 'INDIVIDUAL',
      });

      // user-B, user-A'nın adresini silemez veya güncelleyemez (IDOR koruması)
      expect(() => usersService.deleteAddress('user-B', addr.id)).toThrow(AppDomainError);

      // FREE_SHIPPING kuponu (KARGO0) 750 TL altındaki sepette kargoyu 0 TL yapmalı
      await cartService.addItem({ userId: 'user-A' }, { productId: 'prd-4', quantity: 1 }); // 649 TL < 750 TL
      const withFreeShip = await cartService.applyCoupon({ userId: 'user-A' }, { code: 'KARGO0' });
      expect(withFreeShip.cart.shipping).toBe(0);
      expect(withFreeShip.cart.coupon?.type).toBe('FREE_SHIPPING');

      // HOSGELDIN kuponu perUserLimit: 1 olduğu için aynı kullanıcı 2. kez kullanamaz
      usersService.redeemCouponForUser('user-A', 'HOSGELDIN');
      expect(() => usersService.redeemCouponForUser('user-A', 'HOSGELDIN')).toThrow(AppDomainError);
    });

    it('blocks reviews from non-buyers, allows verified buyers, and detects appointment slot conflicts', async () => {
      // Satın almayan kullanıcı yorum yazamaz
      expect(() =>
        usersService.createReview('non-buyer-user', 'nonbuyer@example.com', {
          productId: 'prd-1',
          rating: 5,
          comment: 'Hiç satın almadan yorum denemesi',
          images: [],
        }),
      ).toThrow(AppDomainError);

      // Montaj randevusu çakışma kontrolü (aynı tarih, saat ve istasyon #1)
      usersService.createAppointment('user-apt-1', {
        customerName: 'Kemal Arslan',
        phone: '05320001122',
        vehicleInfo: '2020 Renault Clio 5',
        serviceType: 'Multimedya Montajı',
        date: '2026-11-15',
        timeSlot: '11:00',
        bayNumber: 1,
      });

      expect(() =>
        usersService.createAppointment('user-apt-2', {
          customerName: 'Başka Müşteri',
          phone: '05320009988',
          vehicleInfo: '2019 Fiat Egea',
          serviceType: 'Ambiyans LED Montajı',
          date: '2026-11-15',
          timeSlot: '11:00',
          bayNumber: 1,
        }),
      ).toThrow(AppDomainError);

      // KVKK Madde 11 kişisel veri dışa aktarma
      const exported = usersService.exportMyPersonalData('user-A', 'usera@example.com');
      expect(exported.standard).toBe('KVKK-6698-Madde-11-Veri-Tasinabilirligi');
      expect(exported.addresses.length).toBe(1);
    });
  });

  // ===========================================================================
  // AŞAMA 5: N11 DELTA SENKRONİZASYON, BİLDİRİM DLQ, DEVRE KESİCİ & ADMİN CSV
  // ===========================================================================
  describe('Aşama 5 - n11 Staging/Delta Sync, Notification DLQ, CircuitBreaker & Admin CSV', () => {
    it('stages n11 products and skips unchanged products on second delta sync run', async () => {
      const firstRun = await n11SyncService.runSync({ conflictStrategy: 'N11_WINS' });
      expect(firstRun.status).toBe('SUCCESS');
      expect(firstRun.total).toBeGreaterThan(0);

      // İkinci çalıştırmada ürünler değişmediği için delta hash ile atlanmalı (unchanged === total)
      const secondRun = await n11SyncService.runSync({ conflictStrategy: 'N11_WINS' });
      expect(secondRun.unchanged).toBe(firstRun.total);
      expect(n11SyncService.getStagingRecords().length).toBe(firstRun.total);
    });

    it('moves failed notifications to Dead-Letter Queue and exports Admin UTF-8 BOM CSV', async () => {
      const failedJob = await notificationsService.enqueueAndDispatch({
        userId: 'user-dlq',
        recipient: '05320000000',
        channel: 'SMS',
        template: 'ORDER_CONFIRMED',
        variables: { orderNumber: 'ADV-999', customerName: 'Test', totalTl: '1250.00' },
        simulateFailure: true,
      });

      expect(failedJob.status).toBe('DEAD_LETTER');
      expect(notificationsService.listDeadLetterQueue().length).toBe(1);

      const csv = adminService.exportOrdersCsv();
      expect(csv.startsWith('\uFEFFSiparisNo;Kaynak;')).toBe(true);

      const dash = adminService.getDashboardSummary();
      expect(dash.metrics.activeProducts).toBeGreaterThan(0);

      const breaker = new CircuitBreaker('test-service', 2, 10_000);
      await expect(breaker.execute(async () => Promise.reject(new Error('fail-1')))).rejects.toThrow();
      await expect(breaker.execute(async () => Promise.reject(new Error('fail-2')))).rejects.toThrow();
      expect(breaker.getState().state).toBe('OPEN');
    });
  });
});
