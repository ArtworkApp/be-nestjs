import { configValidationSchema } from './configuration';

describe('auth configuration', () => {
  const productionConfig = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/artwork',
    JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
  };

  it('requires two different JWT secrets in production', () => {
    const missingRefresh = configValidationSchema.validate({
      ...productionConfig,
      JWT_REFRESH_SECRET: undefined,
    });
    const matchingSecrets = configValidationSchema.validate({
      ...productionConfig,
      JWT_REFRESH_SECRET: productionConfig.JWT_ACCESS_SECRET,
    });

    expect(missingRefresh.error).toBeDefined();
    expect(matchingSecrets.error).toBeDefined();
    expect(
      configValidationSchema.validate(productionConfig).error,
    ).toBeUndefined();
  });

  it('defaults to 15-minute access and 30-day refresh lifetimes', () => {
    const result = configValidationSchema.validate(productionConfig);

    expect(result.value).toMatchObject({
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_SECONDS: 2592000,
    });
  });

  it('uses distinct local-only secrets when development settings are omitted', () => {
    const result = configValidationSchema.validate({
      NODE_ENV: 'development',
      DATABASE_URL: productionConfig.DATABASE_URL,
    });

    expect(result.error).toBeUndefined();
    expect(result.value.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(result.value.JWT_REFRESH_SECRET).not.toBe(
      result.value.JWT_ACCESS_SECRET,
    );
  });
});
