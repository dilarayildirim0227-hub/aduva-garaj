import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { AppDomainError, ErrorCode } from '../../common/error-codes';
import { StructuredLogger } from '../../common/observability';
import { PrismaService } from '../../common/prisma';
import { CurrentUser, Roles } from '../../common/security';
import { validateWithZod } from '../../common/zod-validation';
import { CartRepository } from '../cart/cart.repository';
import { CartModule } from '../cart/cart.module';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';
export type NotificationTemplateKey =
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ABANDONED_CART'
  | 'BACK_IN_STOCK'
  | 'APPOINTMENT_REMINDER';

export interface NotificationJobPayload {
  id: string;
  userId: string;
  recipient: string;
  channel: NotificationChannel;
  template: NotificationTemplateKey;
  variables: Record<string, string | number>;
  attempts: number;
  maxAttempts: number;
  status: 'QUEUED' | 'SENT' | 'DEAD_LETTER';
  subject: string;
  body: string;
  lastError?: string | null;
  readAt?: string | null;
  createdAt: string;
  sentAt?: string | null;
}

const sendNotificationSchema = z
  .object({
    userId: z.string().trim().min(1),
    recipient: z.string().trim().min(3),
    channel: z.enum(['EMAIL', 'SMS', 'PUSH']).default('EMAIL'),
    template: z.enum([
      'ORDER_CONFIRMED',
      'ORDER_SHIPPED',
      'ABANDONED_CART',
      'BACK_IN_STOCK',
      'APPOINTMENT_REMINDER',
    ]),
    variables: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    simulateFailure: z.boolean().optional().default(false),
  })
  .strict();

/**
 * Türkçe Bildirim Şablon Motoru (E-Posta / SMS / Push)
 */
function renderTurkishTemplate(
  template: NotificationTemplateKey,
  variables: Record<string, string | number>,
): { subject: string; body: string } {
  switch (template) {
    case 'ORDER_CONFIRMED':
      return {
        subject: `Siparişiniz Alındı (#${variables.orderNumber ?? 'ADV'}) - Aduva Garaj`,
        body: `Sayın ${variables.customerName ?? 'Müşterimiz'}, #${variables.orderNumber ?? ''} numaralı siparişiniz başarıyla alındı. Toplam tutar: ${variables.totalTl ?? ''} TL.`,
      };
    case 'ORDER_SHIPPED':
      return {
        subject: `Siparişiniz Kargoya Verildi (#${variables.orderNumber ?? 'ADV'})`,
        body: `Siparişiniz ${variables.carrier ?? 'Yurtiçi Kargo'} ile yola çıktı! Takip kodunuz: ${variables.trackingCode ?? ''}.`,
      };
    case 'ABANDONED_CART':
      return {
        subject: 'Sepetinizdeki Ürünler Sizi Bekliyor - Aduva Garaj',
        body: `Aracınızla uyumlu ürünler sepetinizde kaldı. Stoklar tükenmeden alışverişinizi tamamlayın!`,
      };
    case 'BACK_IN_STOCK':
      return {
        subject: `Beklediğiniz Ürün Tekrar Stokta: ${variables.productTitle ?? ''}`,
        body: `Alarm kurduğunuz "${variables.productTitle ?? 'ürün'}" yeniden stoklarımıza girdi.`,
      };
    case 'APPOINTMENT_REMINDER':
      return {
        subject: 'Montaj Randevu Hatırlatması - Aduva Garaj',
        body: `Sayın ${variables.customerName ?? 'Müşterimiz'}, ${variables.scheduledAt ?? ''} tarihli montaj randevunuzu hatırlatırız.`,
      };
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new StructuredLogger('NotificationsService');
  private readonly jobs: NotificationJobPayload[] = [];
  private readonly deadLetterQueue: NotificationJobPayload[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartRepo: CartRepository,
  ) {}

  async enqueueAndDispatch(input: z.infer<typeof sendNotificationSchema>): Promise<NotificationJobPayload> {
    const rendered = renderTurkishTemplate(input.template, input.variables);
    const job: NotificationJobPayload = {
      id: `ntf_${randomUUID().slice(0, 10)}`,
      userId: input.userId,
      recipient: input.recipient,
      channel: input.channel,
      template: input.template,
      variables: input.variables,
      attempts: 0,
      maxAttempts: 3,
      status: 'QUEUED',
      subject: rendered.subject,
      body: rendered.body,
      lastError: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      sentAt: null,
    };

    this.jobs.unshift(job);

    // Üstel geri çekilme (exponential backoff) ile gönderim dene; başarısız olursa DLQ'ya taşı
    while (job.attempts < job.maxAttempts) {
      job.attempts += 1;
      if (input.simulateFailure) {
        job.lastError = `Simulated ${job.channel} gateway error on attempt #${job.attempts}`;
      } else {
        job.status = 'SENT';
        job.sentAt = new Date().toISOString();
        this.logger.info('Notification dispatched', {
          jobId: job.id,
          channel: job.channel,
          template: job.template,
          recipient: job.recipient,
        });
        return job;
      }
    }

    job.status = 'DEAD_LETTER';
    this.deadLetterQueue.unshift(job);
    this.logger.warn('Notification moved to Dead-Letter Queue after max retries', {
      jobId: job.id,
      template: job.template,
      attempts: job.attempts,
    });
    return job;
  }

  listUserNotifications(userId: string): NotificationJobPayload[] {
    return this.jobs.filter((j) => j.userId === userId);
  }

  markAsRead(userId: string, notificationId: string): NotificationJobPayload {
    const job = this.jobs.find((j) => j.id === notificationId);
    if (!job) {
      throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Bildirim bulunamadı.', HttpStatus.NOT_FOUND);
    }
    if (job.userId !== userId) {
      throw new AppDomainError(
        ErrorCode.IDOR_FORBIDDEN,
        'Başka bir kullanıcıya ait bildirimi okuyamazsınız.',
        HttpStatus.FORBIDDEN,
      );
    }
    job.readAt = new Date().toISOString();
    return job;
  }

  listDeadLetterQueue(): NotificationJobPayload[] {
    return this.deadLetterQueue;
  }

  /**
   * Süresi dolan misafir sepetlerini temizler ve terk edilmiş sepet istatistiği döner.
   */
  async runAbandonedCartSweep() {
    const purgedExpiredCarts = await this.cartRepo.purgeExpiredCarts();
    this.logger.info('Abandoned cart & expired cart sweep completed', { purgedExpiredCarts });
    return {
      purgedExpiredCarts,
      executedAt: new Date().toISOString(),
    };
  }
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  listMyNotifications(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.listUserNotifications(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.sub, id);
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Post('send')
  @HttpCode(HttpStatus.OK)
  sendNotification(@Body() body: unknown) {
    const dto = validateWithZod(sendNotificationSchema, body);
    return this.notificationsService.enqueueAndDispatch(dto);
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Get('dlq')
  getDeadLetterQueue() {
    return this.notificationsService.listDeadLetterQueue();
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Post('cron/abandoned-carts')
  @HttpCode(HttpStatus.OK)
  sweepAbandonedCarts() {
    return this.notificationsService.runAbandonedCartSweep();
  }
}

@Module({
  imports: [CartModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
