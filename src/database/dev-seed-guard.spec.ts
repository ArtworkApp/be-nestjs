import { validateDevSeedEnvironment } from '../../prisma/seed/seed-guard';

describe('validateDevSeedEnvironment', () => {
  it('rejects when ALLOW_DEV_SEED is not true', () => {
    expect(() =>
      validateDevSeedEnvironment({
        nodeEnv: 'development',
        allowDevSeed: 'false',
        databaseUrl: 'postgresql://user:pass@localhost:5433/artwork_db',
      }),
    ).toThrow('ALLOW_DEV_SEED=true');
  });

  it('rejects production node env', () => {
    expect(() =>
      validateDevSeedEnvironment({
        nodeEnv: 'production',
        allowDevSeed: 'true',
        databaseUrl: 'postgresql://user:pass@localhost:5433/artwork_db',
      }),
    ).toThrow('production');
  });

  it('rejects non-local database host', () => {
    expect(() =>
      validateDevSeedEnvironment({
        nodeEnv: 'development',
        allowDevSeed: 'true',
        databaseUrl:
          'postgresql://user:pass@prod-rds.amazonaws.com:5432/artwork',
      }),
    ).toThrow('local development database');
  });

  it('returns host and database for local-safe URL', () => {
    expect(
      validateDevSeedEnvironment({
        nodeEnv: 'development',
        allowDevSeed: 'true',
        databaseUrl: 'postgresql://user:pass@postgres:5432/artwork_db',
      }),
    ).toEqual({
      host: 'postgres',
      databaseName: 'artwork_db',
    });
  });
});
