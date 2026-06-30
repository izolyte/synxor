import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { parseAllowedOrigins } from './cors-origins';

export const WS_ALLOWED_ORIGINS_ENV = 'WS_ALLOWED_ORIGINS';

// Sets Socket.io CORS from config at server-creation time — after ConfigModule
// has loaded, which a @WebSocketGateway decorator option cannot guarantee.
export class ConfigurableIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const config = this.app.get(ConfigService);
    const origin = parseAllowedOrigins(config.get<string>(WS_ALLOWED_ORIGINS_ENV));
    return super.createIOServer(port, { ...options, cors: { origin } });
  }
}
