import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfig);

  app.use(helmet());
  // camt.053 bančni izpiski kot XML besedilo presežejo privzeti 100kb json
  // limit; 10mb pokrije tudi mesečne izpiske. Parser, registriran pred
  // Nestovim, prevzame body in privzeti se preskoči (req._body).
  app.use(json({ limit: '10mb' }));
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
