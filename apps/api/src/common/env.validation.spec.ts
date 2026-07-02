import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://synxor:changeme@localhost:5432/synxor',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-32-bytes-xxxxxxxxxxxxxxxxx',
    MINIO_ROOT_USER: 'minioadmin',
    MINIO_ROOT_PASSWORD: 'changeme',
  };

  it('accepts a minimal valid environment', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('coerces numeric vars from their env string form', () => {
    const parsed = validateEnv({ ...validEnv, API_PORT: '3000', MINIO_PORT: '9000' });

    expect(parsed['API_PORT']).toBe(3000);
    expect(parsed['MINIO_PORT']).toBe(9000);
  });

  it('preserves vars the schema does not know about', () => {
    const parsed = validateEnv({ ...validEnv, SOME_MODULE_VAR: 'kept' });

    expect(parsed['SOME_MODULE_VAR']).toBe('kept');
  });

  it.each(['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD'])(
    'names %s in the failure when it is missing',
    (name) => {
      const env: Record<string, unknown> = { ...validEnv };
      delete env[name];

      expect(() => validateEnv(env)).toThrow(new RegExp(name));
    },
  );

  it('rejects a REDIS_URL that is not a redis:// URL', () => {
    expect(() => validateEnv({ ...validEnv, REDIS_URL: 'http://localhost:6379' })).toThrow(
      /REDIS_URL/,
    );
  });

  it('reports every offending var at once', () => {
    const env: Record<string, unknown> = { ...validEnv };
    delete env['DATABASE_URL'];
    delete env['JWT_SECRET'];

    expect(() => validateEnv(env)).toThrow(/DATABASE_URL.*JWT_SECRET/s);
  });

  it('rejects a non-numeric port', () => {
    expect(() => validateEnv({ ...validEnv, API_PORT: 'not-a-port' })).toThrow(/API_PORT/);
  });
});
