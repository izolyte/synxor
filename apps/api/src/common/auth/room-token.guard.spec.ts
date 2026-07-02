import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RoomTokenGuard } from './room-token.guard';
import type { TokenVerifier } from '../../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../../domain/security/token-issuer';

const claims: TokenClaims = { roomId: 'room-1', role: TokenRole.Sender };

function contextFor(authorization?: string): {
  context: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = { headers: { authorization } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('RoomTokenGuard', () => {
  const verifier: TokenVerifier = {
    verify: (token: string) => {
      if (token !== 'valid') throw new Error('bad token');
      return claims;
    },
  };
  const guard = new RoomTokenGuard(verifier);

  it('attaches claims for a valid Bearer token', () => {
    const { context, request } = contextFor('Bearer valid');
    expect(guard.canActivate(context)).toBe(true);
    expect(request['roomTokenClaims']).toEqual(claims);
  });

  it('rejects a missing Authorization header', () => {
    const { context } = contextFor(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a non-Bearer scheme', () => {
    const { context } = contextFor('Basic dXNlcg==');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a token the verifier refuses', () => {
    const { context } = contextFor('Bearer forged');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
