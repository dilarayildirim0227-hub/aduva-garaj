import { generateOrders55, generateProducts105, generateVehicles32 } from '../src/common/catalog-generator';
import { PrismaService } from '../src/common/prisma';
import { EnterpriseDatabaseController } from '../src/modules/enterprise/enterprise.controller';
import { EnterpriseDatabaseService } from '../src/modules/enterprise/enterprise.service';

describe('Aduva Garaj - Veritabanı Gereksinim Analizi ve Portföy Denetimi Test Paketi (A1-A12)', () => {
  let prisma: PrismaService;
  let service: EnterpriseDatabaseService;
  let controller: EnterpriseDatabaseController;

  beforeEach(() => {
    prisma = new PrismaService();
    const vehicles = generateVehicles32();
    const products = generateProducts105(vehicles);
    const orders = generateOrders55(products, vehicles);
    prisma.store.vehicles = vehicles;
    prisma.store.products = products;
    prisma.store.orders = orders;

    service = new EnterpriseDatabaseService(prisma);
    controller = new EnterpriseDatabaseController(service);
  });

  it('A1 & A10) 32 araç modeli, 105 oto aksesuar ürünü ve 55 gerçekçi sipariş kuruş (int) olarak üretilir', () => {
    expect(prisma.store.vehicles.length).toBeGreaterThanOrEqual(30);
    expect(prisma.store.products.length).toBeGreaterThanOrEqual(100);
    expect(prisma.store.orders.length).toBeGreaterThanOrEqual(50);

    for (const p of prisma.store.products) {
      expect(Number.isInteger(p.priceKurus)).toBe(true);
      expect(p.priceKurus).toBeGreaterThan(0);
    }
  });

  it('A4) Araç uyumluluk motoru ve CSV toplu içe aktarma (Index-Only Scan) doğru çalışır', () => {
    const fitRes = controller.checkFitment('prd-1', 'veh-01');
    expect(fitRes.compatible).toBe(true);
    expect(fitRes.matchType).toBe('EXACT_VEHICLE_FITMENT');

    const csv = [
      'seller_code,ktype_code,notes,verified_by_vin',
      'ADV-MM-001,KT-40911,VW Golf 7 ekstra uyumluluk eklendi,true',
    ].join('\n');
    const imp = controller.importCsv({ csv });
    expect(imp.imported).toBe(1);

    const afterImport = controller.checkFitment('prd-1', 'veh-09');
    expect(afterImport.compatible).toBe(true);
  });

  it('A5) Türkçe karakter duyarsız (unaccent) ve yazım hatası toleranslı (pg_trgm) arama çalışır', () => {
    // Türkçe karakter olmadan ve yazım hatalı arama: "opel astra havzlu pasps"
    const res = controller.search('opel astra havzlu pasps');
    expect(res.totalMatches).toBeGreaterThan(0);
    expect(res.items[0].title.toLowerCase()).toContain('astra');
    expect(res.explainPlan.unaccentConfig).toBe('turkish_unaccent');
  });

  it('A6 & A9) Optimistic Locking (version) çakışmayı yakalar, fiyat ve stok geçmişini kaydeder', () => {
    const updated = controller.updatePriceAndStock('prd-1', {
      newPriceKurus: 849900,
      stockDelta: 5,
      expectedVersion: 1,
      source: 'ADMIN_MANUAL',
    });
    expect(updated.version).toBe(2);
    expect(updated.priceKurus).toBe(849900);

    // Eski version (1) ile tekrar güncelleme denemesi OPTIMISTIC_LOCK_CONFLICT fırlatmalı
    expect(() =>
      controller.updatePriceAndStock('prd-1', {
        newPriceKurus: 859900,
        expectedVersion: 1,
      }),
    ).toThrow(/OPTIMISTIC_LOCK_CONFLICT/);

    const audit = controller.getAuditLogs();
    expect(audit.priceHistory.length).toBe(1);
    expect(audit.stockMovements.length).toBe(1);
    expect(audit.logs.length).toBeGreaterThanOrEqual(1);
  });

  it('A7) n11 delta senkronizasyonu yerel araç uyumluluk (fitment) verilerini ezmeden stok/fiyat eşitler', () => {
    const syncRun = controller.runN11Sync({ trigger: 'MANUAL_ADMIN' });
    expect(syncRun.status).toBe('SUCCESS');
    expect(syncRun.preservedLocalFitments).toBeGreaterThanOrEqual(96);
    expect(syncRun.conflictPolicy).toContain('FITMENT_OEM=LOCAL_MASTER');
  });

  it('A8) KVKK AES-256-GCM TCKN şifrelemesi, rıza kaydı ve VUK 10 yıl fatura korumalı anonimleştirme çalışır', () => {
    const encrypted = service.encryptTcIdentity('12345678901');
    expect(encrypted).not.toContain('12345678901');
    expect(service.decryptTcIdentity(encrypted)).toBe('12345678901');

    const consent = controller.recordConsent({
      userId: 'usr-kvkk-1',
      consentType: 'KVKK_AYDINLATMA',
      granted: true,
    });
    expect(consent.granted).toBe(true);

    const anon = controller.forgetUser('usr-kvkk-1', { sub: 'usr-kvkk-1', role: 'CUSTOMER' });
    expect(anon.name).toBe('Anonim Kullanıcı');
    expect(anon.phone).toBeNull();
    expect(anon.retainedInvoicePolicy).toContain('10 yıl');

    // SEC-02: Başka bir müşteri başka bir kullanıcının hesabını anonimleştiremez (IDOR koruması)
    expect(() =>
      controller.forgetUser('usr-kvkk-2', { sub: 'usr-attacker', role: 'CUSTOMER' }),
    ).toThrow();
  });

  it('A12) Admin dashboard Materialized View (mv_daily_sales_summary) raporlaması doğru hesaplanır', () => {
    const report = controller.getDashboardReport();
    expect(report.materializedView).toBe('mv_daily_sales_summary');
    expect(report.summary.totalOrders).toBe(55);
    expect(report.summary.totalProducts).toBe(105);
    expect(report.summary.totalVehicles).toBe(32);
    expect(report.topSellingProducts).toHaveLength(5);
    expect(report.salesByVehicleBrand.length).toBeGreaterThan(0);
  });
});
