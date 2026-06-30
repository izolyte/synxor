import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigurableIoAdapter } from './infrastructure/websocket/configurable-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new ConfigurableIoAdapter(app));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT ?? process.env.PORT ?? 3000));
}
void bootstrap();
