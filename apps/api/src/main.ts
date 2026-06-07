import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfig);

  app.use(helmet());
  app.enableCors({
    origin: config.devAuth ? true : config.webAppBaseUrl,
    allowedHeaders: ['authorization', 'content-type', 'x-tenant-id', 'x-request-id', 'accept'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();

  // Reject unknown fields; transform payloads to DTO instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  await app.listen(config.port);
  new Logger('Bootstrap').log(`API listening on :${config.port} (${config.nodeEnv})`);
}

void bootstrap();
