import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { EmailJobClaimService } from '../src/email/email-job-claim.service';
import { EmailJobOutcomeService } from '../src/email/email-job-outcome.service';
import { EmailJobLoaderService } from '../src/email/email-job-loader.service';

const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('email job claims on PostgreSQL', () => {
  const userId = randomUUID();
  let pool: Pool;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, `${userId}@example.test`, 'hash'],
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await prisma?.$disconnect();
      await pool.end();
    }
  });

  it('claims once across concurrent workers and reclaims an expired lease', async () => {
    const jobId = randomUUID();
    await pool.query(
      "INSERT INTO email_jobs (id, user_id, kind, idempotency_key, expires_at, updated_at) VALUES ($1, $2, 'WELCOME', $3, NOW() + INTERVAL '1 hour', NOW())",
      [jobId, userId, jobId],
    );
    const worker = new EmailJobClaimService(prisma as PrismaService);
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

  it('prevents a stale lease from changing a reclaimed job', async () => {
    const jobId = randomUUID();
    await pool.query(
      "INSERT INTO email_jobs (id, user_id, kind, idempotency_key, encrypted_payload, payload_key_id, expires_at, updated_at) VALUES ($1, $2, 'WELCOME', $3, $4, 'key-1', NOW() + INTERVAL '1 hour', NOW())",
      [jobId, userId, jobId, Buffer.from('encrypted')],
    );
    const worker = new EmailJobClaimService(prisma as PrismaService);
    const outcomes = new EmailJobOutcomeService(prisma as PrismaService);
    const [firstClaim] = await worker.claim({
      batchSize: 1,
      leaseDurationMs: 30000,
    });
    await pool.query(
      "UPDATE email_jobs SET lease_expires_at = NOW() - INTERVAL '1 second' WHERE id = $1",
      [jobId],
    );
    const [currentClaim] = await worker.claim({
      batchSize: 1,
      leaseDurationMs: 30000,
    });

    expect(firstClaim.id).toBe(jobId);
    expect(currentClaim.id).toBe(jobId);
    expect(await outcomes.markSent(firstClaim)).toBe(false);
    expect(
      await outcomes.scheduleRetry(firstClaim, new Date(Date.now() + 60000)),
    ).toBe(false);
    expect(await outcomes.markSent(currentClaim)).toBe(true);
    const job = await pool.query(
      'SELECT status, encrypted_payload, payload_key_id FROM email_jobs WHERE id = $1',
      [jobId],
    );
    expect(job.rows[0]).toEqual({
      status: 'SENT',
      encrypted_payload: null,
      payload_key_id: null,
    });
  });

  it('stops loading a reset job once its token is used', async () => {
    const tokenId = randomUUID();
    const jobId = randomUUID();
    await pool.query(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')",
      [tokenId, userId, tokenId],
    );
    await pool.query(
      "INSERT INTO email_jobs (id, user_id, reset_token_id, kind, idempotency_key, expires_at, updated_at) VALUES ($1, $2, $3, 'PASSWORD_RESET', $4, NOW() + INTERVAL '1 hour', NOW())",
      [jobId, userId, tokenId, jobId],
    );
    const [claim] = await new EmailJobClaimService(
      prisma as PrismaService,
    ).claim({ batchSize: 1, leaseDurationMs: 30000 });
    const loader = new EmailJobLoaderService(prisma as PrismaService);
    expect(claim.id).toBe(jobId);
    expect((await loader.load(claim))?.id).toBe(jobId);
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [tokenId],
    );
    expect(await loader.load(claim)).toBeNull();
  });
});
