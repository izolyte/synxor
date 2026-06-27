// Env var holding the secret used to sign Room Tokens.
export const JWT_SECRET_ENV = 'JWT_SECRET';

// Symmetric signing algorithm for Room Tokens.
export const JWT_ALGORITHM = 'HS256' as const;

// Minimum byte length for the Room Token signing secret — a floor against
// trivially short/empty secrets, not an entropy guarantee. Operators should
// supply a high-entropy random value, e.g. `openssl rand -base64 48`.
export const JWT_SECRET_MIN_BYTES = 32;
