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
const TOKEN_KEY = 'roomTokenRaw';

// HTTP counterpart of the gateway's handshake auth: Bearer <roomToken>. Any
// controller behind this guard can pull the verified claims via @RoomClaims(),
// or the raw token via @RoomToken() (the upload path hashes it to attribute the
// file to its author, the same hash the socket join recorded).
@Injectable()
export class RoomTokenGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractToken(request);
    if (!token) throw new UnauthorizedException('Missing room token');

    try {
      (request as RequestWithClaims)[CLAIMS_KEY] = this.tokenVerifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid room token');
    }
    (request as RequestWithClaims)[TOKEN_KEY] = token;
    return true;
  }
}

type RequestWithClaims = Request & { [CLAIMS_KEY]?: TokenClaims; [TOKEN_KEY]?: string };

// For collaborators (guards, filters) that need the verified claims outside a
// parameter decorator.
export function roomClaimsFrom(request: Request): TokenClaims | undefined {
  return (request as RequestWithClaims)[CLAIMS_KEY];
}

// Bearer header first; `?token=` second. The query form exists for browser-native
// download navigations (<a download>), which cannot set headers — the token is
// Room-scoped and expires with the Room, which bounds what a logged URL leaks.
function extractToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
  const query = (request.query as Record<string, unknown>)?.token;
  return typeof query === 'string' && query.length > 0 ? query : undefined;
}

export const RoomClaims = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithClaims>();
  return request[CLAIMS_KEY];
});

// The verified raw Room Token, for handlers that need to hash it (author
// attribution) rather than just read its claims. Populated by RoomTokenGuard.
export const RoomToken = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithClaims>();
  return request[TOKEN_KEY];
});
