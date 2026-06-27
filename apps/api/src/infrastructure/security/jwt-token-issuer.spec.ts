import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JWT_ALGORITHM } from './security.constants';
import { TokenRole } from '../../domain/security/token-issuer';
import { HOUR_MS, SECOND_MS } from '../../common/time';

describe('JwtTokenIssuer', () => {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { algorithm: JWT_ALGORITHM } });
  const issuer = new JwtTokenIssuer(jwt);

  it('signs a verifiable JWT carrying the claims', () => {
    const token = issuer.sign({ roomId: 'room-1', role: TokenRole.Sender }, new Date(Date.now() + HOUR_MS));

    const payload = jwt.verify<{ roomId: string; role: string }>(token);
    expect(payload.roomId).toBe('room-1');
    expect(payload.role).toBe(TokenRole.Sender);
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
