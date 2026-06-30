import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, type Request, type Response, type NextFunction } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfig);

  app.use(helmet());
  // Body limit po poti (DoS površina): velik limit SAMO tam, kjer ga rabimo —
  // bančni izpiski (camt.053 XML) lahko presežejo nekaj sto kb. Vse ostale poti
  // dobijo skromen 1mb. Parser, registriran pred Nestovim, prevzame body.
  const TEN_MB = '10mb';
  const ONE_MB = '1mb';
  app.use((req: Request, res: Response, next: NextFunction) => {
    // /bank-import/* sprejme velike izpiske; drugje 1mb zadošča.
    const big = req.path.startsWith('/bank-import');
    return json({ limit: big ? TEN_MB : ONE_MB })(req, res, next);
  });
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
