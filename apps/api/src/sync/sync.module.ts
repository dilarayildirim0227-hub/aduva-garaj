import { InjectQueue, Processor, WorkerHost, BullModule } from '@nestjs/bullmq';
import { Controller, Get, Logger, Module, OnModuleInit, Post, Query } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../common/prisma';
import { Roles } from '../common/security';
import { ProductSyncService } from './product-sync.service';

export const SYNC_QUEUE = 'n11-sync';
export const JOB_PRODUCTS = 'products';

const queueImport = BullModule.registerQueue({
  name: SYNC_QUEUE,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/** Admin uç noktaları: senkron durumu ve manuel tetikleme */
@Controller('admin/sync')
@Roles('ADMIN', 'OPERATIONS')
export class SyncController {
  constructor(@InjectQueue(SYNC_QUEUE) private readonly queue: Queue, private readonly prisma: PrismaService) {}

  @Post('products')
  async triggerProducts() {
    const job = await this.queue.add(JOB_PRODUCTS, { trigger: 'manual' }, { jobId: `manual-${Date.now()}` });
    return { queued: true, jobId: job.id };
  }

  @Get('logs')
  logs(@Query('limit') limit = '20') {
    return this.prisma.syncLog.findMany({ orderBy: { startedAt: 'desc' }, take: Math.min(Number(limit) || 20, 100) });
  }

  @Get('status')
  async status() {
    const [counts, last] = await Promise.all([
      this.queue.getJobCounts('active', 'waiting', 'failed', 'delayed'),
      this.prisma.syncLog.findFirst({ where: { type: 'PRODUCTS' }, orderBy: { startedAt: 'desc' } }),
    ]);
    return { queue: counts, lastRun: last };
  }
}

/** API süreci: sadece kuyruğa iş ekler */
@Module({ imports: [queueImport], controllers: [SyncController] })
export class SyncApiModule {}

/** Worker süreci: işleri çalıştırır ve periyodik zamanlayıcıyı kurar */
@Processor(SYNC_QUEUE, { concurrency: 1 })
export class SyncProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger('SyncProcessor');
  constructor(private readonly products: ProductSyncService, @InjectQueue(SYNC_QUEUE) private readonly queue: Queue) {
    super();
  }

  async onModuleInit() {
    const minutes = Number(process.env.N11_SYNC_CRON_MINUTES ?? 15);
    await this.queue.upsertJobScheduler('products-cron', { every: minutes * 60_000 }, { name: JOB_PRODUCTS, data: { trigger: 'cron' } });
    this.logger.log(`Ürün senkronu her ${minutes} dakikada bir planlandı`);
  }

  async process(job: Job<{ trigger: 'cron' | 'manual' }>) {
    if (job.name === JOB_PRODUCTS) {
      const r = await this.products.run(job.data.trigger);
      // TODO(Aşama 4): r.changes → fiyat düşüşü / stok geldi push bildirim kuyruğu
      return { ...r, changes: r.changes.length };
    }
    // TODO(Aşama 3): JOB_ORDERS → n11 sipariş senkronu
  }
}

@Module({ imports: [queueImport], providers: [ProductSyncService, SyncProcessor] })
export class SyncWorkerModule {}
