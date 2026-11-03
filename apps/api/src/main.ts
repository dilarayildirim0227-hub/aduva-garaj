import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, RequestCorrelationInterceptor } from './common/observability';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 1_000_000 }),
  );
  await app.register(helmet, { contentSecurityPolicy: false });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalInterceptors(new RequestCorrelationInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('v1', { exclude: ['/', 'health', 'ready'] });
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  const logger = new Logger('Bootstrap');
  logger.log(`Aduva Garaj Uygulama & Yönetim Paneli -> http://localhost:${port}`);
  logger.log(`REST API Uç Noktası                   -> http://localhost:${port}/v1`);
}
bootstrap();
