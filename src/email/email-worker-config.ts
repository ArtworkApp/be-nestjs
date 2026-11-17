import { ConfigService } from '@nestjs/config';

export interface EmailWorkerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  batchSize: number;
  concurrency: number;
  leaseDurationMs: number;
  maxAttempts: number;
  retryDelayMs: number;
}

function positiveInteger(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = config.get<string | number>(key);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Invalid ${key}.`);
  }
  return value;
}

export function readEmailWorkerConfig(
  config: ConfigService,
  runtime: 'api' | 'worker',
): EmailWorkerConfig {
  const mode = config.get<string>('EMAIL_WORKER_MODE') ?? 'disabled';
  if (!['disabled', 'local', 'standalone'].includes(mode)) {
    throw new Error('Invalid EMAIL_WORKER_MODE.');
  }
  if (mode === 'local' && config.get<string>('NODE_ENV') === 'production') {
    throw new Error('Local email worker mode is not allowed in production.');
  }
  const settings: EmailWorkerConfig = {
    enabled:
      (mode === 'local' && runtime === 'api') ||
      (mode === 'standalone' && runtime === 'worker'),
    pollIntervalMs: positiveInteger(
      config,
      'EMAIL_WORKER_POLL_INTERVAL_MS',
      5000,
    ),
    batchSize: positiveInteger(config, 'EMAIL_WORKER_BATCH_SIZE', 10),
    concurrency: positiveInteger(config, 'EMAIL_WORKER_CONCURRENCY', 2),
    leaseDurationMs: positiveInteger(
      config,
      'EMAIL_WORKER_LEASE_DURATION_MS',
      120000,
    ),
    maxAttempts: positiveInteger(config, 'EMAIL_WORKER_MAX_ATTEMPTS', 5),
    retryDelayMs: positiveInteger(config, 'EMAIL_WORKER_RETRY_DELAY_MS', 60000),
  };
  if (settings.concurrency > settings.batchSize) {
    throw new Error('Email worker concurrency cannot exceed batch size.');
  }
  return settings;
}
