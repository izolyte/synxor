// Env var holding the secret used to sign Room Tokens.
export const JWT_SECRET_ENV = 'JWT_SECRET';

// Symmetric signing algorithm for Room Tokens.
export const JWT_ALGORITHM = 'HS256' as const;

// Minimum byte length for the Room Token signing secret — a floor against
// trivially short/empty secrets, not an entropy guarantee. Operators should
// supply a high-entropy random value, e.g. `openssl rand -base64 48`.
export const JWT_SECRET_MIN_BYTES = 32;

// RFC 8725 §3.8/§3.9: pin issuer and audience so a token minted by (or for)
// another HS256 service that happens to share a secret is still rejected.
export const JWT_ISSUER = 'synxor';
export const JWT_AUDIENCE = 'synxor:room';
