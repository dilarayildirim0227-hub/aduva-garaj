import { Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartRepository, LocalN11StockProvider } from './cart.repository';
import { CartService } from './cart.service';
import { N11StockProvider } from './cart.types';

/**
 * Süresi dolmuş (30 günü geçmiş) misafir sepetlerini temizleyen günlük zamanlayıcı (BullMQ / Cron işçisi)
 */
@Injectable()
export class ExpiredCartCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiredCartCleanupScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly repo: CartRepository) {}

  onModuleInit() {
    // Günlük periyodik temizlik (24 saatte bir)
    this.timer = setInterval(async () => {
      const purged = await this.repo.purgeExpiredCarts();
      if (purged > 0) {
        this.logger.log({ event: 'cart.expired_purged', purgedCount: purged });
      }
    }, 24 * 60 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

@Module({
  controllers: [CartController],
  providers: [
    CartRepository,
    CartService,
    ExpiredCartCleanupScheduler,
    {
      provide: N11StockProvider,
      useClass: LocalN11StockProvider,
    },
  ],
  exports: [CartService, CartRepository],
})
export class CartModule {}
