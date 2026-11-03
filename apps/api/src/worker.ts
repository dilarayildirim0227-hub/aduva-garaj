import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app.module';

/** Ayrı süreç: BullMQ worker (n11 senkronu, ileride bildirim işleri) */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Worker çalışıyor');
}
bootstrap();
