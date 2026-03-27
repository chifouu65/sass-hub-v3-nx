import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import cookieParser = require('cookie-parser');
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = process.env.PORT ?? 4303;
  const isProduction = process.env.NODE_ENV === 'production';

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
