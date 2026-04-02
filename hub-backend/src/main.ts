/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { loadAuthConfig } from './app/auth/auth.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const globalPrefix = 'api';
  const cfg = loadAuthConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(cookieParser());

  if (isProduction) {
    // En production : servir le build Angular hub-frontend comme assets statiques
    // Le dossier public/ est copié depuis dist/hub-frontend/browser/ dans le Dockerfile
    const publicPath = join(__dirname, 'public');
    if (existsSync(publicPath)) {
      app.useStaticAssets(publicPath);
      // Fallback SPA : toute route non-/api renvoie index.html (Angular router)
      app.use((req: any, res: any, next: any) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(join(publicPath, 'index.html'));
        } else {
          next();
        }
      });
    }
    // En prod, le frontend est sur la même origine → CORS restreint
    app.enableCors({ origin: cfg.corsOrigins, credentials: true });
  } else {
    app.enableCors({ origin: cfg.corsOrigins, credentials: true });
  }

  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.PORT ?? 4301);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  Logger.log(
    `🚀 Application is running on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/${globalPrefix}`,
  );
}

bootstrap();
