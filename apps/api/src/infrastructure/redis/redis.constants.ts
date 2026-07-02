// Env var holding the Redis connection URL.
export const REDIS_URL_ENV = 'REDIS_URL';

// Injection token for the shared ioredis client.
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
