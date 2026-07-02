import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ALLOWED_ORIGINS_ENV, parseAllowedOrigins } from './common/cors-origins';
import { ConfigurableIoAdapter } from './infrastructure/websocket/configurable-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  // HTTP CORS mirrors the Socket.io policy set by ConfigurableIoAdapter below —
  // same parse, same fail-closed rule in production, separate env var.
  app.enableCors({
    origin: parseAllowedOrigins(ALLOWED_ORIGINS_ENV, config.get<string>(ALLOWED_ORIGINS_ENV), {
      production: config.get<string>('NODE_ENV') === 'production',
    }),
  });

  app.useWebSocketAdapter(new ConfigurableIoAdapter(app));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT ?? process.env.PORT ?? 3000));
}
void bootstrap();
