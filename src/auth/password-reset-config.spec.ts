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
