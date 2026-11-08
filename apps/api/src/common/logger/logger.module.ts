import { Global, Module, DynamicModule, Provider } from '@nestjs/common';
import pino, { Logger, LoggerOptions } from 'pino';
import { CONFIG_OPTIONS } from '../common.constants';

export interface LoggerModuleOptions {
  pinoOptions?: LoggerOptions;
}

export interface LoggerModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
  inject?: any[];
}

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    const { pinoOptions = {} } = options;

    const defaultOptions: LoggerOptions = {
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      base: {
        service: 'aduva-garaj-api',
        pid: process.pid,
      },
      ...pinoOptions,
    };

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const logger = isDevelopment
      ? pino({
          ...defaultOptions,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname,service',
            },
          },
        })
      : pino(defaultOptions);

    const loggerProvider: Provider = {
      provide: 'PINO_LOGGER',
      useValue: logger,
    };

    return {
      module: LoggerModule,
      providers: [loggerProvider],
      exports: ['PINO_LOGGER'],
    };
  }

  static forRootAsync(options: LoggerModuleAsyncOptions): DynamicModule {
    const asyncProvider: Provider = {
      provide: CONFIG_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: LoggerModule,
      imports: options.imports || [],
      providers: [asyncProvider],
      exports: [CONFIG_OPTIONS],
    };
  }
}