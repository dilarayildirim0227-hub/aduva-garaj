import { Body, Controller, Get, Header, Injectable, Module, Patch, Query } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma';
import { CurrentUser, Roles } from '../../common/security';
import { validateWithZod } from '../../common/zod-validation';

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

const updateSettingsSchema = z
  .object({
    order_mode: z.enum(['DIRECT_CHECKOUT', 'WHATSAPP']).optional(),
    free_shipping_threshold: z.number().min(0).optional(),
    shipping_flat_rate: z.number().min(0).optional(),
    cod_fee: z.number().min(0).optional(),
  })
  .strict();

@Injectable()
export class AdminService {
  private readonly auditLogs: AuditLogRecord[] = [
    {
      id: 'aud-seed-1',
      actorId: 'usr-admin-1',
      actorRole: 'ADMIN',
      action: 'SYSTEM_BOOT',
      entityType: 'SYSTEM',
      entityId: 'aduva-garaj',
      changes: { note: 'Aduva Garaj denetim kayıt sistemi aktif' },
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  recordAudit(
    actorId: string,
    actorRole: string,
    action: string,
    entityType: string,
    entityId: string,
    changes: Record<string, unknown>,
  ): AuditLogRecord {
    const entry: AuditLogRecord = {
      id: `aud_${randomUUID().slice(0, 10)}`,
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      changes,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  getDashboardSummary() {
    const products = this.prisma.store.products.filter((p) => !p.deletedAt);
    const orders = this.prisma.store.orders;
    const totalRevenueTl = orders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .reduce((acc, o) => acc + Number(o.total ?? 0), 0);

    const lowStockProducts = products
      .filter((p) => Number(p.stock ?? 0) <= 10)
      .map((p) => ({
        id: p.id,
        title: p.title,
        sellerCode: p.sellerCode,
        stock: p.stock,
      }));

    return {
      metrics: {
        totalRevenueTl: Number(totalRevenueTl.toFixed(2)),
        totalRevenueKurus: Math.round(totalRevenueTl * 100),
        totalOrders: orders.length,
        activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
        lowStockCount: lowStockProducts.length,
        supportedVehiclesCount: this.prisma.store.vehicles.length,
        activeCouponsCount: this.prisma.store.coupons.filter((c) => c.active !== false).length,
        pendingAppointmentsCount: this.prisma.store.appointments.filter((a) => a.status === 'CONFIRMED').length,
      },
      lowStockProducts,
      latestSync: null,
    };
  }

  exportOrdersCsv(): string {
    const header = 'SiparisNo;Kaynak;Musteri;Sehir;Durum;OdemeYontemi;TutarTL;KargoFirmasi;TakipKodu;Tarih';
    const rows = this.prisma.store.orders.map((o) => {
      const cells = [
        o.orderNumber ?? o.id,
        o.source ?? 'APP',
        o.customerName ?? '',
        o.city ?? '',
        o.status ?? '',
        o.paymentMethod ?? '',
        Number(o.total ?? 0).toFixed(2),
        o.carrier ?? '',
        o.trackingCode ?? '',
        o.createdAt ?? '',
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`);
      return cells.join(';');
    });
    // UTF-8 BOM ile Excel'de Türkçe karakterlerin doğru açılmasını garanti eder
    return '﻿' + [header, ...rows].join('\r\n');
  }

  exportProductsCsv(): string {
    const header = 'UrunID;StokKodu;Baslik;Marka;FiyatTL;Stok;Durum';
    const rows = this.prisma.store.products
      .filter((p) => !p.deletedAt)
      .map((p) => {
        const cells = [
          p.id,
          p.sellerCode ?? '',
          p.title ?? '',
          p.brand ?? '',
          Number(p.price ?? 0).toFixed(2),
          Number(p.stock ?? 0),
          p.status ?? 'ACTIVE',
        ].map((val) => `"${String(val).replace(/"/g, '""')}"`);
        return cells.join(';');
      });
    return '﻿' + [header, ...rows].join('\r\n');
  }

  updateSettings(actor: { sub: string; role?: string }, body: unknown) {
    const dto = validateWithZod(updateSettingsSchema, body);
    const before = { ...this.prisma.store.settings };
    Object.assign(this.prisma.store.settings, dto);
    this.recordAudit(actor.sub, actor.role ?? 'ADMIN', 'UPDATE_SETTINGS', 'SETTINGS', 'global', {
      before,
      after: this.prisma.store.settings,
    });
    return this.prisma.store.settings;
  }

  listAuditLogs(limit = 50): AuditLogRecord[] {
    return this.auditLogs.slice(0, Math.min(200, Math.max(1, limit)));
  }
}

@Roles('ADMIN', 'OPERATIONS')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardSummary();
  }

  @Get('export/orders.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aduva-garaj-siparisler.csv"')
  exportOrdersCsv() {
    return this.adminService.exportOrdersCsv();
  }

  @Get('export/products.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aduva-garaj-urunler.csv"')
  exportProductsCsv() {
    return this.adminService.exportProductsCsv();
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: { sub: string; role?: string }, @Body() body: unknown) {
    return this.adminService.updateSettings(user, body);
  }

  @Get('audit-logs')
  getAuditLogs(@Query('limit') limit?: string) {
    return this.adminService.listAuditLogs(limit ? Number(limit) : 50);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}