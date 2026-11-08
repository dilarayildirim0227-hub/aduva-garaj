import { Controller, Get, Header, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaModule, PrismaService } from './common/prisma';
import { AuthGuard, Public } from './common/security';
import { LoggerModule } from './common/logger';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
export const configImport = ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] });

@Controller()
class RootPreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index() {
    const candidates = [
      join(__dirname, 'preview', 'preview.html'),
      join(process.cwd(), 'src', 'preview', 'preview.html'),
      join(process.cwd(), 'apps', 'api', 'src', 'preview', 'preview.html'),
    ];
    for (const p of candidates) {
      try {
        return readFileSync(p, 'utf8');
      } catch {}
    }
    return '<h1>Aduva Garaj API Aktif</h1>';
  }

  @Public()
  @Get('health')
  health() {
    return { ok: true, status: 'UP', time: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  ready() {
    const mem = process.memoryUsage();
    return {
      ok: true,
      ready: true,
      databaseMode: this.prisma.isConnected ? 'POSTGRESQL' : 'LOCAL_STORE_FALLBACK',
      catalogCount: this.prisma.store.products.length,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      time: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    configImport,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    LoggerModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    UsersModule,
    NotificationsModule,
    AdminModule,
    EnterpriseModule,
    HealthModule,
  ],
  controllers: [RootPreviewController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

/**
 * Arka Plan İşçi Modülü (BullMQ / bildirim kuyruğu işçisi)
 */
@Module({
  imports: [configImport, PrismaModule, NotificationsModule],
})
export class WorkerModule {}
