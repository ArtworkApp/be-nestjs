import { ConfigService } from '@nestjs/config';
import { readPasswordResetConfig } from './password-reset-config';

describe('password reset configuration', () => {
  function config(values: Record<string, string>) {
    return { get: (key: string) => values[key] } as ConfigService;
  }

  it('uses local defaults during development', () => {
    expect(
      readPasswordResetConfig(config({ NODE_ENV: 'development' })),
    ).toEqual({
      origin: 'http://localhost:3000',
      lifetimeSeconds: 900,
    });
  });

  it('requires an explicit HTTPS origin in production', () => {
    expect(() =>
      readPasswordResetConfig(config({ NODE_ENV: 'production' })),
    ).toThrow();
    expect(() =>
      readPasswordResetConfig(
        config({
          NODE_ENV: 'production',
          PASSWORD_RESET_WEB_ORIGIN: 'http://localhost:3000',
        }),
      ),
    ).toThrow();
    expect(
      readPasswordResetConfig(
        config({
          NODE_ENV: 'production',
          PASSWORD_RESET_WEB_ORIGIN: 'https://app.example.com',
        }),
      ),
    ).toEqual({
      origin: 'https://app.example.com',
      lifetimeSeconds: 900,
    });
  });

  it.each([
    'http://10.1.2.3:3000',
    'http://172.30.1.49:3000',
    'http://192.168.1.2:3000',
  ])('allows a private network origin during development: %s', (origin) => {
    expect(
      readPasswordResetConfig(
        config({ NODE_ENV: 'development', PASSWORD_RESET_WEB_ORIGIN: origin }),
      ).origin,
    ).toBe(origin);
    expect(() =>
      readPasswordResetConfig(
        config({ NODE_ENV: 'production', PASSWORD_RESET_WEB_ORIGIN: origin }),
      ),
    ).toThrow();
  });

  it.each([
    'http://172.32.0.1:3000',
    'http://8.8.8.8:3000',
    'http://example.com',
  ])('rejects a public HTTP origin: %s', (origin) => {
    expect(() =>
      readPasswordResetConfig(
        config({ NODE_ENV: 'development', PASSWORD_RESET_WEB_ORIGIN: origin }),
      ),
    ).toThrow();
  });

  it.each(['0', '-1', '1.5', '86401', 'not-a-number'])(
    'rejects invalid token lifetimes',
    (value) => {
      expect(() =>
        readPasswordResetConfig(config({ PASSWORD_RESET_TTL_SECONDS: value })),
      ).toThrow();
    },
  );

  it('rejects an untrusted origin', () => {
    expect(() =>
      readPasswordResetConfig(
        config({ PASSWORD_RESET_WEB_ORIGIN: 'https://example.com/path' }),
      ),
    ).toThrow();
  });
});
