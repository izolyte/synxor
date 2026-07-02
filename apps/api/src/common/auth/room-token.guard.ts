import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../domain/security/token-verifier';
import type { TokenClaims } from '../../domain/security/token-issuer';

const CLAIMS_KEY = 'roomTokenClaims';

// HTTP counterpart of the gateway's handshake auth: Bearer <roomToken>. Any
// controller behind this guard can pull the verified claims via @RoomClaims().
@Injectable()
export class RoomTokenGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException('Missing room token');

    try {
      (request as RequestWithClaims)[CLAIMS_KEY] = this.tokenVerifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid room token');
    }
    return true;
  }
}

type RequestWithClaims = Request & { [CLAIMS_KEY]?: TokenClaims };

export const RoomClaims = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithClaims>();
  return request[CLAIMS_KEY];
});
