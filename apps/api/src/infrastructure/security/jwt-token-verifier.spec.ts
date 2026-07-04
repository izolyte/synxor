import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JwtTokenVerifier } from './jwt-token-verifier';
import { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } from './security.constants';
import { TokenRole } from '../../domain/security/token-issuer';
import { HOUR_MS, SECOND_MS } from '../../common/time';

describe('JwtTokenVerifier', () => {
  const SECRET = 'test-secret-32-bytes-xxxxxxxxxxxxxxxxx';
  // Mirrors SecurityModule's JwtModule config so issued tokens carry iss/aud.
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  });
  const issuer = new JwtTokenIssuer(jwt);
  const verifier = new JwtTokenVerifier(jwt);

  it('returns claims for a valid token', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() + HOUR_MS),
    );

    const claims = verifier.verify(token);

    expect(claims).toMatchObject({ roomId: 'room-1', role: TokenRole.Sender });
  });

  it('throws when the token is expired', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() - SECOND_MS),
    );

    expect(() => verifier.verify(token)).toThrow();
  });

  it('throws when the token is tampered', () => {
    const token = issuer.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      new Date(Date.now() + HOUR_MS),
    );
    const tampered = token.slice(0, -4) + 'XXXX';

    expect(() => verifier.verify(tampered)).toThrow();
  });

  it('throws when the token carries a foreign issuer', () => {
    const token = jwt.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      { issuer: 'someone-else', subject: 'room-1', expiresIn: 60 },
    );

    expect(() => verifier.verify(token)).toThrow();
  });

  it('throws when the token targets a different audience', () => {
    const token = jwt.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      { audience: 'other-service', subject: 'room-1', expiresIn: 60 },
    );

    expect(() => verifier.verify(token)).toThrow();
  });

  it('throws when sub disagrees with roomId', () => {
    const token = jwt.sign(
      { roomId: 'room-1', role: TokenRole.Sender },
      { subject: 'room-2', expiresIn: 60 },
    );

    expect(() => verifier.verify(token)).toThrow(/subject/);
  });

  it('throws when sub is absent', () => {
    const token = jwt.sign({ roomId: 'room-1', role: TokenRole.Sender }, { expiresIn: 60 });

    expect(() => verifier.verify(token)).toThrow(/subject/);
  });
});
