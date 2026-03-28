import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import cookieParser = require('cookie-parser');
import axios from 'axios';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = process.env.PORT ?? 4303;
  const isProduction = process.env.NODE_ENV === 'production';

  // Register hub-api proxy BEFORE NestJS routing and static assets.
  // This bypasses Express 5 wildcard matching issues in NestJS forRoutes.
  const hubUrl = process.env['HUB_API_URL'] ?? 'http://localhost:4301/api';
  app.use('/hub-api', async (req: any, res: any, next: any) => {
    const path = (req.originalUrl as string).replace(/^\/hub-api/, '');
    const targetUrl = `${hubUrl}${path}`;
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers as Record<string, string | string[]>)) {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
          headers[key] = Array.isArray(value) ? value.join(', ') : (value ?? '');
        }
      }
      const axiosRes = await axios({
        method: req.method,
        url: targetUrl,
        headers,
        data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
        validateStatus: () => true,
        responseType: 'arraybuffer',
        maxRedirects: 0,
      });
      for (const [key, value] of Object.entries(axiosRes.headers)) {
        if (key.toLowerCase() === 'transfer-encoding') continue;
        if (value !== undefined) res.setHeader(key, value as string | string[]);
      }
      res.status(axiosRes.status).send(axiosRes.data);
    } catch (err) {
      console.error('[HubProxy] error:', (err as Error).message);
      next(err);
    }
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  if (isProduction) {
    // En production : NestJS sert le build Angular (frontend/browser/)
    // Le dossier public/ est copié depuis dist/foodtruck-frontend/browser/ dans le Dockerfile
    const publicPath = join(__dirname, 'public');
    if (existsSync(publicPath)) {
      app.useStaticAssets(publicPath);
      // Fallback SPA : toute route non-/api renvoie index.html (Angular router)
      app.use((req: any, res: any, next: any) => {
        // Laisser passer /api/* (backend) et /hub-api/* (proxy OAuth)
        if (!req.path.startsWith('/api') && !req.path.startsWith('/hub-api')) {
          res.sendFile(join(publicPath, 'index.html'));
        } else {
          next();
        }
      });
    }
    // En prod, le frontend est sur la même origine → pas besoin de CORS
    app.enableCors({ origin: false, credentials: true });
  } else {
    // En développement : CORS ouvert vers le dev server Angular
    const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:4201')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    app.enableCors({ origin: corsOrigins, credentials: true });
  }

  await app.listen(port);
  console.log(`FoodTruck Backend listening on port ${port}`);
}

bootstrap();
