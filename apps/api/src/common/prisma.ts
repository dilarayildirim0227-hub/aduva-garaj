import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { localStore as localStoreData } from './local-store';
import type { LocalStoreData } from '@aduva/shared';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');
  public isConnected = false;
  public readonly store: LocalStoreData = localStoreData;

  async onModuleInit() {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 1500)),
      ]);
      this.isConnected = true;
      this.logger.log('PostgreSQL bağlantısı aktif');
    } catch {
      this.isConnected = false;
      this.logger.warn('PostgreSQL erişilemedi -> Yerel bellek veri deposu (LocalStore) aktif edildi');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
