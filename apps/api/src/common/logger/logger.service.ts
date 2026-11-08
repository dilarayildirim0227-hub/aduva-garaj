import { Inject, Injectable, Scope } from '@nestjs/common';
import { Logger } from 'pino';
import { RequestCorrelationInterceptor } from '../observability';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(@Inject('PINO_LOGGER') private readonly logger: Logger) {}

  private childLogger(context: string, requestId?: string) {
    return this.logger.child({ context, requestId });
  }

  info(context: string, message: string, meta: Record<string, unknown> = {}, requestId?: string) {
    this.childLogger(context, requestId).info(meta, message);
  }

  warn(context: string, message: string, meta: Record<string, unknown> = {}, requestId?: string) {
    this.childLogger(context, requestId).warn(meta, message);
  }

  error(context: string, message: string, meta: Record<string, unknown> = {}, requestId?: string) {
    this.childLogger(context, requestId).error(meta, message);
  }

  debug(context: string, message: string, meta: Record<string, unknown> = {}, requestId?: string) {
    this.childLogger(context, requestId).debug(meta, message);
  }

  logHttpRequest(
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    meta: Record<string, unknown> = {},
  ) {
    this.logger.info(
      {
        requestId,
        method,
        url,
        statusCode,
        durationMs,
        ...meta,
      },
      'http_request_completed',
    );
  }

  logDomainError(
    requestId: string,
    code: string,
    statusCode: number,
    path: string,
    message: string,
  ) {
    this.logger.error(
      {
        requestId,
        code,
        statusCode,
        path,
      },
      message,
    );
  }

  logUnhandledError(
    requestId: string,
    path: string,
    error: Error,
  ) {
    this.logger.error(
      {
        requestId,
        path,
        errorMessage: error.message,
        stack: error.stack,
      },
      'unhandled_exception',
    );
  }
}

export const extractRequestId = (req: RequestCorrelationInterceptor extends { intercept: (context: any) => any } ? any : any): string => {
  return req?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};