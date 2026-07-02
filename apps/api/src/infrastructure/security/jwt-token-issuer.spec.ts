import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } from './security.constants';
import { TokenRole } from '../../domain/security/token-issuer';
import { HOUR_MS, SECOND_MS } from '../../common/time';

describe('JwtTokenIssuer', () => {
  // Mirrors SecurityModule's JwtModule config so issued tokens carry iss/aud.
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  });
  const issuer = new JwtTokenIssuer(jwt);

  it('signs a verifiable JWT carrying the claims', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() + HOUR_MS),
    );

    const payload = jwt.verify<{ roomId: string; role: string }>(token);
    expect(payload.roomId).toBe('room-1');
    expect(payload.role).toBe(TokenRole.Sender);
  });

  it('stamps iss/aud from module config and sub from roomId (RFC 8725)', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() + HOUR_MS),
    );

    const payload = jwt.verify<{ iss: string; aud: string; sub: string }>(token);
    expect(payload.iss).toBe(JWT_ISSUER);
    expect(payload.aud).toBe(JWT_AUDIENCE);
    expect(payload.sub).toBe('room-1');
  });

  it('derives exp from the expiry instant, not a payload claim', () => {
    const expiresAt = new Date(Date.now() + HOUR_MS);
    const token = issuer.sign({ roomId: 'room-1', role: TokenRole.Sender }, expiresAt);

    const payload = jwt.verify<{ exp: number }>(token);
    expect(payload.exp).toBeCloseTo(Math.floor(expiresAt.getTime() / SECOND_MS), -1);
  });

  it('rejects a token once its expiry has passed', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() - SECOND_MS),
    );

    expect(() => {
      jwt.verify(token);
    }).toThrow();
  });
});
