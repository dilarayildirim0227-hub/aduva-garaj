import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { CircuitBreaker, StructuredLogger } from '../common/observability';
import { PrismaService } from '../common/prisma';
import { Public, Roles } from '../common/security';
import { validateWithZod } from '../common/zod-validation';
import { N11_CLIENT, N11Client, N11ProductSummary } from './n11-client.interface';

export type ConflictStrategy = 'N11_WINS' | 'LOCAL_WINS';

export interface StagingProductRecord {
  id: string;
  n11Id: string;
  sellerCode: string | null;
  rawPayload: N11ProductSummary;
  payloadHash: string;
  syncStatus: 'STAGED' | 'APPLIED' | 'SKIPPED_UNCHANGED' | 'FAILED';
  errorMessage: string | null;
  fetchedAt: string;
  processedAt: string | null;
}

export interface SyncRunLog {
  id: string;
  type: 'PRODUCTS' | 'ORDERS' | 'FULL';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  trigger: 'manual' | 'cron';
  conflictStrategy: ConflictStrategy;
  startedAt: string;
  finishedAt: string;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: Array<{ n11Id: string; message: string }>;
}

const triggerSyncSchema = z
  .object({
    type: z.enum(['PRODUCTS', 'ORDERS', 'FULL']).optional().default('FULL'),
    conflictStrategy: z.enum(['N11_WINS', 'LOCAL_WINS']).optional().default('N11_WINS'),
    forceFullSync: z.boolean().optional().default(false),
  })
  .strict();

@Injectable()
export class N11SyncService {
  private readonly logger = new StructuredLogger('N11SyncService');
  private readonly breaker = new CircuitBreaker('n11-soap-api', 4, 30_000);
  private readonly stagingTable = new Map<string, StagingProductRecord>();
  private readonly priceHistory: Array<{
    id: string;
    productId: string;
    oldPrice: number;
    newPrice: number;
    source: string;
    changedAt: string;
  }> = [];

  constructor(
    @Inject(N11_CLIENT) private readonly n11Client: N11Client,
    private readonly prisma: PrismaService,
  ) {}

  private computeHash(item: N11ProductSummary): string {
    return createHash('sha256')
      .update(`${item.n11Id}|${item.title}|${item.price}|${item.stock}|${item.saleStatus}`)
      .digest('hex');
  }

  /**
   * Üstel geri çekilme (exponential backoff) ile n11 API çağrısı
   */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    let lastErr: unknown;
    while (attempt < maxRetries) {
      attempt += 1;
      try {
        return await this.breaker.execute(fn);
      } catch (err) {
        lastErr = err;
        const backoffMs = Math.min(200, 25 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
    throw lastErr;
  }

  /**
   * Staging tablosu + Delta karşılaştırma + Çakışma çözümü ile n11 Senkronizasyonu
   */
  async runSync(
    options: {
      type?: 'PRODUCTS' | 'ORDERS' | 'FULL';
      conflictStrategy?: ConflictStrategy;
      forceFullSync?: boolean;
      trigger?: 'manual' | 'cron';
    } = {},
  ): Promise<SyncRunLog> {
    const syncType = options.type ?? 'FULL';
    const strategy = options.conflictStrategy ?? 'N11_WINS';
    const forceFull = options.forceFullSync ?? false;
    const startedAt = new Date().toISOString();

    let total = 0;
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const errors: Array<{ n11Id: string; message: string }> = [];

    try {
      const page = await this.withRetry(() => this.n11Client.listProducts(0, 100));
      total = page.items.length;

      for (const item of page.items) {
        try {
          const payloadHash = this.computeHash(item);
          const prevStaged = this.stagingTable.get(item.n11Id);

          // 1. Önce Staging tablosuna kaydet
          const staged: StagingProductRecord = {
            id: prevStaged?.id ?? `stg_${randomUUID().slice(0, 8)}`,
            n11Id: item.n11Id,
            sellerCode: item.sellerCode ?? null,
            rawPayload: item,
            payloadHash,
            syncStatus: 'STAGED',
            errorMessage: null,
            fetchedAt: new Date().toISOString(),
            processedAt: null,
          };
          this.stagingTable.set(item.n11Id, staged);

          // 2. Delta kontrolü: Hash değişmediyse ve forceFullSync değilse atla
          if (!forceFull && prevStaged && prevStaged.payloadHash === payloadHash) {
            staged.syncStatus = 'SKIPPED_UNCHANGED';
            staged.processedAt = new Date().toISOString();
            unchanged += 1;
            continue;
          }

          // 3. Ana ürün tablosuyla eşleştir ve çakışma kuralını uygula
          const existing = this.prisma.store.products.find((p) => String(p.n11Id) === String(item.n11Id));
          if (existing) {
            const oldPrice = Number(existing.price);
            if (strategy === 'N11_WINS') {
              if (oldPrice !== item.price) {
                this.priceHistory.unshift({
                  id: `ph_${randomUUID().slice(0, 8)}`,
                  productId: existing.id,
                  oldPrice,
                  newPrice: item.price,
                  source: 'N11_SYNC',
                  changedAt: new Date().toISOString(),
                });
              }
              existing.price = item.price;
              existing.stock = item.stock;
              existing.status = item.saleStatus === 'ACTIVE' ? 'ACTIVE' : 'OUT_OF_STOCK';
            } else {
              // LOCAL_WINS: Yerel fiyat korunur, yalnızca stok güncellenir
              existing.stock = item.stock;
            }
            staged.syncStatus = 'APPLIED';
            staged.processedAt = new Date().toISOString();
            updated += 1;
          } else {
            this.prisma.store.products.push({
              id: `prd_n11_${item.n11Id}`,
              n11Id: item.n11Id,
              sellerCode: item.sellerCode ?? `N11-${item.n11Id}`,
              slug: `n11-urun-${item.n11Id}`,
              title: item.title,
              description: `${item.title} (n11 mağazasından senkronize edildi)`,
              brand: 'Aduva Garaj',
              price: item.price,
              listPrice: item.listPrice ?? Math.round(item.price * 1.15),
              stock: item.stock,
              status: item.saleStatus === 'ACTIVE' ? 'ACTIVE' : 'OUT_OF_STOCK',
              categoryId: 'cat-multimedya',
              isUniversal: true,
              isFeatured: false,
              requiresMontage: false,
              ratingAvg: 4.8,
              ratingCount: 1,
              soldCount: 0,
              image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
              images: [],
              fitmentVehicleIds: [],
              attributes: {},
            });
            staged.syncStatus = 'APPLIED';
            staged.processedAt = new Date().toISOString();
            created += 1;
          }
        } catch (itemErr) {
          failed += 1;
          const msg = itemErr instanceof Error ? itemErr.message : 'Bilinmeyen ürün senkron hatası';
          errors.push({ n11Id: item.n11Id, message: msg });
        }
      }
    } catch (err) {
      failed += 1;
      errors.push({
        n11Id: 'GLOBAL',
        message: err instanceof Error ? err.message : 'n11 bağlantı hatası',
      });
    }

    const logEntry: SyncRunLog = {
      id: `sync_${randomUUID().slice(0, 8)}`,
      type: syncType,
      status: failed === 0 ? 'SUCCESS' : created + updated > 0 ? 'PARTIAL' : 'FAILED',
      trigger: options.trigger ?? 'manual',
      conflictStrategy: strategy,
      startedAt,
      finishedAt: new Date().toISOString(),
      total,
      created,
      updated,
      unchanged,
      failed,
      errors,
    };

    this.prisma.store.syncLogs.unshift(logEntry);
    this.logger.info('n11 delta sync finished', {
      syncId: logEntry.id,
      status: logEntry.status,
      total,
      created,
      updated,
      unchanged,
      failed,
    });

    return logEntry;
  }

  getStagingRecords(): StagingProductRecord[] {
    return Array.from(this.stagingTable.values());
  }

  getSyncLogs(): SyncRunLog[] {
    return this.prisma.store.syncLogs;
  }

  getPriceHistory() {
    return this.priceHistory;
  }

  getCircuitState() {
    return this.breaker.getState();
  }
}

@Controller('n11')
export class N11SyncController {
  constructor(private readonly syncService: N11SyncService) {}

  @Roles('ADMIN', 'OPERATIONS')
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  triggerManualSync(@Body() body: unknown) {
    const dto = validateWithZod(triggerSyncSchema, body ?? {});
    return this.syncService.runSync({
      type: dto.type,
      conflictStrategy: dto.conflictStrategy,
      forceFullSync: dto.forceFullSync,
      trigger: 'manual',
    });
  }

  @Public()
  @Get('sync/logs')
  getSyncLogs() {
    return this.syncService.getSyncLogs();
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Get('staging')
  getStagingTable() {
    return this.syncService.getStagingRecords();
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Get('price-history')
  getPriceHistory() {
    return this.syncService.getPriceHistory();
  }
}
