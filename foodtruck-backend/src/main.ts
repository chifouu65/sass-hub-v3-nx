import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import cookieParser = require('cookie-parser');
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 4303;
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:4201')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port);
  console.log(`FoodTruck Backend listening on port ${port}`);
}

bootstrap();
