/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { loadAuthConfig } from './app/auth/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  const cfg = loadAuthConfig();

  app.use(cookieParser());
  app.enableCors({
    origin: cfg.corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.PORT ?? 4301);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  Logger.log(
    `🚀 Application is running on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/${globalPrefix}`,
  );
}

bootstrap();
