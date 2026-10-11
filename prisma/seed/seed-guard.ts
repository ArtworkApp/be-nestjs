interface SeedEnvironmentOptions {
  nodeEnv?: string;
  allowDevSeed?: string;
  databaseUrl?: string;
}

interface SeedEnvironmentResult {
  host: string;
  databaseName: string;
}

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres']);
const PRODUCTION_HOST_HINTS = ['amazonaws.com', 'rds.', 'prod', 'production'];

export function validateDevSeedEnvironment(
  options: SeedEnvironmentOptions,
): SeedEnvironmentResult {
  if (options.allowDevSeed !== 'true') {
    throw new Error('Seeding is blocked: set ALLOW_DEV_SEED=true to proceed.');
  }
  if ((options.nodeEnv ?? '').toLowerCase() === 'production') {
    throw new Error('Seeding is blocked in production NODE_ENV.');
  }
  if (!options.databaseUrl) {
    throw new Error('Seeding is blocked: DATABASE_URL is missing.');
  }

  const parsed = new URL(options.databaseUrl);
  const host = parsed.hostname.toLowerCase();
  const databaseName = parsed.pathname.replace(/^\//, '');

  if (
    !ALLOWED_HOSTS.has(host) ||
    PRODUCTION_HOST_HINTS.some((hint) => host.includes(hint))
  ) {
    throw new Error('Seeding is allowed only for an explicitly local development database.');
  }

  if (
    !databaseName.includes('artwork_db') &&
    !databaseName.includes('dev') &&
    !databaseName.includes('local') &&
    !databaseName.includes('test')
  ) {
    throw new Error(
      'Seeding is blocked: database name does not match local development naming.',
    );
  }

  return { host, databaseName };
}
