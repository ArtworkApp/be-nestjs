import { ConfigService } from '@nestjs/config';
import { readEmailWorkerConfig } from './email-worker-config';

describe('email worker configuration', () => {
  function config(values: Record<string, string>) {
    return { get: (key: string) => values[key] } as ConfigService;
  }

  it('defaults the API worker to disabled', () => {
    expect(readEmailWorkerConfig(config({}), 'api')).toMatchObject({
      enabled: false,
    });
  });

  it('enables a local API worker with bounded default settings', () => {
    expect(
      readEmailWorkerConfig(
        config({ NODE_ENV: 'development', EMAIL_WORKER_MODE: 'local' }),
        'api',
      ),
    ).toEqual({
      enabled: true,
      pollIntervalMs: 5000,
      batchSize: 10,
      concurrency: 2,
      leaseDurationMs: 120000,
      maxAttempts: 5,
      retryDelayMs: 60000,
    });
  });

  it('enables only the standalone process in standalone mode', () => {
    const values = { NODE_ENV: 'production', EMAIL_WORKER_MODE: 'standalone' };
    expect(readEmailWorkerConfig(config(values), 'api').enabled).toBe(false);
    expect(readEmailWorkerConfig(config(values), 'worker').enabled).toBe(true);
  });

  it('rejects local worker mode in production and unknown modes', () => {
    expect(() =>
      readEmailWorkerConfig(
        config({ NODE_ENV: 'production', EMAIL_WORKER_MODE: 'local' }),
        'api',
      ),
    ).toThrow();
    expect(() =>
      readEmailWorkerConfig(config({ EMAIL_WORKER_MODE: 'other' }), 'api'),
    ).toThrow();
  });

  it.each([
    { EMAIL_WORKER_BATCH_SIZE: '0' },
    { EMAIL_WORKER_CONCURRENCY: '11' },
    { EMAIL_WORKER_POLL_INTERVAL_MS: '1.5' },
    { EMAIL_WORKER_MAX_ATTEMPTS: 'invalid' },
  ])('rejects invalid worker settings', (values) => {
    expect(() =>
      readEmailWorkerConfig(
        config({ EMAIL_WORKER_MODE: 'local', ...values }),
        'api',
      ),
    ).toThrow();
  });
});
