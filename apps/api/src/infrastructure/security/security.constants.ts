// Env var holding the secret used to sign Room Tokens.
export const JWT_SECRET_ENV = 'JWT_SECRET';

// Symmetric signing algorithm for Room Tokens.
export const JWT_ALGORITHM = 'HS256' as const;

// OWASP: an HS256 secret should carry at least as many bits as the hash output
// (256 bits → 32 chars). Shorter secrets are trivial to brute-force / forge.
export const JWT_SECRET_MIN_LENGTH = 32;
