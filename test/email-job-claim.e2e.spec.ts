import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { EmailJobClaimService } from '../src/email/email-job-claim.service';

const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('email job claims on PostgreSQL', () => {
  const userId = randomUUID();
  let pool: Pool;
  let prisma: PrismaService;
  let previousDatabaseUrl: string | undefined;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaService();
    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, `${userId}@example.test`, 'hash'],
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await pool.end();
    }
    await prisma?.$disconnect();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('claims once across concurrent workers and reclaims an expired lease', async () => {
    const jobId = randomUUID();
    await pool.query(
      "INSERT INTO email_jobs (id, user_id, kind, idempotency_key, expires_at, updated_at) VALUES ($1, $2, 'WELCOME', $3, NOW() + INTERVAL '1 hour', NOW())",
      [jobId, userId, jobId],
    );
    const worker = new EmailJobClaimService(prisma);
    const claims = await Promise.all([
      worker.claim({ batchSize: 1, leaseDurationMs: 30000 }),
      worker.claim({ batchSize: 1, leaseDurationMs: 30000 }),
    ]);
    const claimed = claims.flat();
    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe(jobId);

    await pool.query(
      "UPDATE email_jobs SET lease_expires_at = NOW() - INTERVAL '1 second' WHERE id = $1",
      [jobId],
    );
    const reclaimed = await worker.claim({
      batchSize: 1,
      leaseDurationMs: 30000,
    });
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].id).toBe(jobId);
    expect(reclaimed[0].leaseId).not.toBe(claimed[0].leaseId);
  });
});
