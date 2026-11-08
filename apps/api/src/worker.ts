import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app.module';

/** Ayrı süreç: Background worker (bildirim işleri, planlı temizlikler) */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Worker çalışıyor');
}
bootstrap();
