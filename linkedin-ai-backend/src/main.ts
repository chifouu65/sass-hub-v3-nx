/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

const resolvePort = (): number => {
  const arg = process.argv.find((a) => a.startsWith('--port='));
  if (arg) {
    const parsed = Number(arg.split('=')[1]);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const flagIndex = process.argv.findIndex((a) => a === '--port');
  if (flagIndex >= 0) {
    const parsed = Number(process.argv[flagIndex + 1]);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const envPort = Number(process.env.PORT);
  if (!Number.isNaN(envPort) && envPort > 0) return envPort;
  return 4302;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = resolvePort();
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
