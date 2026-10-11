import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { validateDevSeedEnvironment } from './seed/seed-guard';
import { formatSeedSummary, runDevSeed } from './seed/dev-seed-runner';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const seedEnvironment = validateDevSeedEnvironment({
  nodeEnv: process.env.NODE_ENV,
  allowDevSeed: process.env.ALLOW_DEV_SEED,
  databaseUrl: process.env.DATABASE_URL,
});

runDevSeed({
  prisma,
  nodeEnv: process.env.NODE_ENV,
  databaseName: seedEnvironment.databaseName,
})
  .then((summary) => {
    console.log(formatSeedSummary(summary));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
