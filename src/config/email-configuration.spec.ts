import { configValidationSchema } from './configuration';

describe('email configuration', () => {
  const databaseUrl = 'postgresql://user:pass@localhost:5432/artwork';
  const productionConfig = {
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
    AUTH_COOKIE_DOMAIN: '.example.com',
    AUTH_WEB_ORIGINS: 'https://app.example.com',
    EMAIL_TRANSPORT: 'ses',
    FROM_EMAIL: 'accounts@example.com',
  };

  it('defaults to the local mail transport in development', () => {
    const result = configValidationSchema.validate({
      NODE_ENV: 'development',
      DATABASE_URL: databaseUrl,
    });

    expect(result.error).toBeUndefined();
    expect(result.value.EMAIL_TRANSPORT).toBe('mailpit');
    expect(result.value.MAILPIT_SMTP_HOST).toBe('mailpit');
    expect(result.value.MAILPIT_SMTP_PORT).toBe(1025);
  });

  it('requires SES and an explicit sender address in production', () => {
    expect(
      configValidationSchema.validate(productionConfig).error,
    ).toBeUndefined();
    expect(
      configValidationSchema.validate({
        ...productionConfig,
        EMAIL_TRANSPORT: undefined,
      }).error,
    ).toBeDefined();
    expect(
      configValidationSchema.validate({
        ...productionConfig,
        EMAIL_TRANSPORT: 'mailpit',
      }).error,
    ).toBeDefined();
    expect(
      configValidationSchema.validate({
        ...productionConfig,
        FROM_EMAIL: undefined,
      }).error,
    ).toBeDefined();
  });

  it('rejects unsupported transports and invalid sender addresses', () => {
    expect(
      configValidationSchema.validate({
        NODE_ENV: 'development',
        DATABASE_URL: databaseUrl,
        EMAIL_TRANSPORT: 'other',
      }).error,
    ).toBeDefined();
    expect(
      configValidationSchema.validate({
        NODE_ENV: 'development',
        DATABASE_URL: databaseUrl,
        FROM_EMAIL: 'not-an-email',
      }).error,
    ).toBeDefined();
  });

  it('rejects an invalid SMTP port', () => {
    const result = configValidationSchema.validate({
      NODE_ENV: 'development',
      DATABASE_URL: databaseUrl,
      MAILPIT_SMTP_PORT: 70000,
    });
    expect(result.error).toBeDefined();
  });
});
