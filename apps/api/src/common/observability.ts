import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import { AppDomainError, ErrorCode } from './error-codes';

// KVKK uyumlu PII (Kişisel Veri) maskeleme yardımcıları
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'tckn',
  'tcidentityno',
  'taxnumber',
  'cardnumber',
  'cvv',
  'cvc',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'code',
]);

export function maskPiiValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) return '***REDACTED***';
  if (typeof value === 'string') {
    if (lower.includes('email') && value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (lower.includes('phone') && value.length >= 7) {
      return `${value.slice(0, 4)}***${value.slice(-2)}`;
    }
  }
  return value;
}

export function maskPiiObject(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((item) => maskPiiObject(item));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = typeof v === 'object' && v !== null ? maskPiiObject(v) : maskPiiValue(k, v);
  }
  return out;
}

// Yapılandırılmış İngilizce JSON Logger (Pino formatıyla uyumlu)
export class StructuredLogger {
  constructor(private readonly contextName?: string) {}

  info(event: string, meta: Record<string, unknown> = {}): void {
    StructuredLogger.info(event, { context: this.contextName, ...meta });
  }

  warn(event: string, meta: Record<string, unknown> = {}): void {
    StructuredLogger.info(event, { level: 'warn', context: this.contextName, ...meta });
  }

  error(event: string, meta: Record<string, unknown> = {}): void {
    StructuredLogger.error(event, { context: this.contextName, ...meta });
  }

  static info(event: string, meta: Record<string, unknown> = {}): void {
    const entry = {
      level: 'info',
      time: new Date().toISOString(),
      service: 'aduva-garaj-api',
      event,
      ...(maskPiiObject(meta) as Record<string, unknown>),
    };
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  }

  static error(event: string, meta: Record<string, unknown> = {}): void {
    const entry = {
      level: 'error',
      time: new Date().toISOString(),
      service: 'aduva-garaj-api',
      event,
      ...(maskPiiObject(meta) as Record<string, unknown>),
    };
    if (process.env.NODE_ENV !== 'test') {
      process.stderr.write(JSON.stringify(entry) + '\n');
    }
  }
}

// X-Request-Id Korelasyon ve İstek Süresi Ölçüm Interceptor'ı
@Injectable()
export class RequestCorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      method?: string;
      url?: string;
      requestId?: string;
    }>();
    const res = http.getResponse<{ header?: (k: string, v: string) => void }>();

    const incomingId = req.headers?.['x-request-id'];
    const requestId =
      (Array.isArray(incomingId) ? incomingId[0] : incomingId) || `req_${randomUUID()}`;
    req.requestId = requestId;
    if (typeof res?.header === 'function') {
      res.header('X-Request-Id', requestId);
    }

    const startedAt = performance.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number((performance.now() - startedAt).toFixed(2));
          StructuredLogger.info('http_request_completed', {
            requestId,
            method: req.method,
            url: req.url,
            durationMs,
          });
        },
      }),
    );
  }
}

// Merkezi Hata Yöneticisi: Tutarlı Türkçe hata mesajı + sabit hata kodu
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ requestId?: string; method?: string; url?: string }>();
    const res = ctx.getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();

    const requestId = req?.requestId ?? `req_${randomUUID()}`;

    if (exception instanceof AppDomainError) {
      StructuredLogger.error('domain_error', {
        requestId,
        code: exception.code,
        statusCode: exception.statusCode,
        path: req?.url,
      });
      res.status(exception.statusCode).send({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? null,
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'object' && raw !== null && 'error' in raw) {
        res.status(status).send({
          ...(raw as Record<string, unknown>),
          requestId,
        });
        return;
      }
      const message =
        typeof raw === 'string'
          ? raw
          : typeof raw === 'object' && raw !== null && 'message' in raw
            ? String((raw as { message: unknown }).message)
            : 'İstek işlenirken bir hata oluştu.';
      res.status(status).send({
        error: {
          code: status === 400 ? ErrorCode.VALIDATION_FAILED : ErrorCode.INTERNAL_SERVER_ERROR,
          message,
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    StructuredLogger.error('unhandled_exception', {
      requestId,
      path: req?.url,
      errorMessage: exception instanceof Error ? exception.message : String(exception),
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Sunucu tarafında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Dış Servisler (iyzico 3DS, Kargo API) İçin Circuit Breaker
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    private readonly serviceName: string,
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 30_000,
    private readonly callTimeoutMs = 8_000,
  ) {}

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.openedAt >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const current = this.getState();
    if (current === 'OPEN') {
      throw new AppDomainError(
        ErrorCode.CIRCUIT_BREAKER_OPEN,
        `${this.serviceName} servisi geçici olarak yanıt vermiyor. Lütfen birkaç saniye sonra tekrar deneyin.`,
        503,
        { service: this.serviceName, state: this.state },
      );
    }

    try {
      const result = await Promise.race<T>([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${this.serviceName} timeout (${this.callTimeoutMs}ms)`)),
            this.callTimeoutMs,
          ),
        ),
      ]);
      this.failureCount = 0;
      this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.openedAt = Date.now();
        StructuredLogger.error('circuit_breaker_opened', {
          service: this.serviceName,
          failureCount: this.failureCount,
        });
      }
      throw err;
    }
  }
}
