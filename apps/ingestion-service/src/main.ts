import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // The ingestion service has no HTTP interface — it is a pure background worker. so no TCP port is opened.
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.enableShutdownHooks();
  await app.init();

  console.log('Ingestion service started');
}

bootstrap();
