import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, JwtPayload, Public, Roles } from '../../common/security';
import { EnterpriseDatabaseService } from './enterprise.service';

/**
 * SEC-02 Çözümü:
 * - Sınıf seviyesindeki `@Public()` kaldırıldı.
 * - Yalnızca katalog arama ve uyumluluk sorgusu halka açık (`@Public()`).
 * - Fiyat/stok güncelleme, CSV içe aktarma, n11 senkron, denetim logları ve raporlar `@Roles('ADMIN', 'OPERATIONS')` ile korunur.
 * - KVKK unutulma hakkı (`DELETE /kvkk/forget-me/:userId`) yalnızca ilgili kullanıcının kendisi veya ADMIN tarafından çağrılabilir.
 */
@Controller()
export class EnterpriseDatabaseController {
  constructor(private readonly service: EnterpriseDatabaseService) {}

  /** A4: Ürün - Araç Uyumluluk Sorgusu (Index-Only Scan + gerçek metrik) */
  @Public()
  @Get('fitment/check')
  checkFitment(@Query('productId') productId: string, @Query('vehicleId') vehicleId: string) {
    return this.service.checkProductFitment(productId, vehicleId);
  }

  /** A4: CSV ile Toplu Araç Uyumluluk İçe Aktarma (Yalnızca ADMIN/OPERATIONS) */
  @Roles('ADMIN', 'OPERATIONS')
  @Post('fitment/import-csv')
  importCsv(@Body() body: { csv?: string }, @CurrentUser() user?: JwtPayload) {
    return this.service.importFitmentsFromCsv(body.csv || '', user?.sub || 'ADMIN');
  }

  /** A5: Türkçe Tam Metin Arama (turkish_unaccent + pg_trgm benzerlik motoru) */
  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('vehicleId') vehicleId?: string) {
    return this.service.searchTurkishCatalog(q || '', vehicleId);
  }

  /** A6 & A9: Optimistic Locking (version) + Fiyat ve Stok Hareket Kayıtlı Güncelleme (Yalnızca ADMIN/OPERATIONS) */
  @Roles('ADMIN', 'OPERATIONS')
  @Patch('catalog/:productId/price-stock')
  updatePriceAndStock(
    @Param('productId') productId: string,
    @Body()
    body: {
      newPriceKurus: number;
      stockDelta?: number;
      expectedVersion?: number;
      source?: 'N11_SYNC' | 'ADMIN_MANUAL' | 'CAMPAIGN';
    },
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.service.updateProductPriceAndStock({
      productId,
      newPriceKurus: Number(body.newPriceKurus),
      stockDelta: body.stockDelta !== undefined ? Number(body.stockDelta) : 0,
      expectedVersion: body.expectedVersion,
      source: body.source || 'ADMIN_MANUAL',
      actorId: user?.sub || 'ADMIN',
    });
  }

  /** A7: n11 Delta Senkronizasyon ve Alan Bazlı Çakışma Çözümü (Yalnızca ADMIN/OPERATIONS) */
  @Roles('ADMIN', 'OPERATIONS')
  @Post('n11-sync/run')
  runN11Sync(@Body() body?: { trigger?: 'CRON' | 'WEBHOOK' | 'MANUAL_ADMIN' }) {
    return this.service.runN11DeltaSync(body?.trigger || 'MANUAL_ADMIN');
  }

  /** A8: KVKK Açık Rıza ve İYS Ticari İleti Kaydı */
  @Post('kvkk/consents')
  recordConsent(
    @Body()
    body: {
      userId: string;
      consentType: 'KVKK_AYDINLATMA' | 'EXPLICIT_CONSENT' | 'IYS_SMS' | 'IYS_EMAIL';
      policyVersion?: string;
      granted: boolean;
      ipAddress?: string;
    },
    @CurrentUser() user?: JwtPayload,
  ) {
    if (user && user.role !== 'ADMIN' && user.sub !== body.userId) {
      throw new ForbiddenException('Başka bir kullanıcı adına KVKK rıza kaydı oluşturamazsınız.');
    }
    return this.service.recordKvkkConsent({
      userId: body.userId,
      consentType: body.consentType,
      policyVersion: body.policyVersion || 'v2026.1',
      granted: Boolean(body.granted),
      ipAddress: body.ipAddress || '127.0.0.1',
    });
  }

  /** A8: KVKK Unutulma Hakkı (VUK 10 Yıl Fatura Korumalı Anonimleştirme - IDOR Korumalı) */
  @Delete('kvkk/forget-me/:userId')
  forgetUser(@Param('userId') userId: string, @CurrentUser() user?: JwtPayload) {
    if (user && user.role !== 'ADMIN' && user.sub !== userId) {
      throw new ForbiddenException(
        'Yalnızca kendi hesabınız için KVKK unutulma hakkı (anonimleştirme) talebi gönderebilirsiniz.',
      );
    }
    return this.service.anonymizeUserForKvkk(userId);
  }

  /** A9: Denetim Logları, Fiyat Geçmişi ve Stok Hareketleri (Yalnızca ADMIN) */
  @Roles('ADMIN')
  @Get('audit/logs')
  getAuditLogs() {
    return {
      logs: this.service.auditLogs,
      priceHistory: this.service.priceHistory,
      stockMovements: this.service.stockMovements,
    };
  }

  /** A12: Admin Dashboard Materialized View Raporlama Uç Noktası (Yalnızca ADMIN/OPERATIONS) */
  @Roles('ADMIN', 'OPERATIONS')
  @Get('reports/dashboard')
  getDashboardReport() {
    return this.service.getDashboardAnalytics();
  }
}
