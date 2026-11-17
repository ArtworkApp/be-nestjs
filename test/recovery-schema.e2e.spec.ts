import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// Use only an isolated database with the migrations already applied.
const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('account recovery schema on PostgreSQL', () => {
  let pool: Pool;
  const userId = randomUUID();
  const tokenId = randomUUID();
  const jobId = randomUUID();
  const tokenHash = `hash-${tokenId}`;
  const jobKey = `job-${jobId}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
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
  });

  it('stores reset tokens uniquely and initializes the session version', async () => {
    const user = await pool.query(
      'SELECT session_version FROM users WHERE id = $1',
      [userId],
    );
    expect(user.rows[0].session_version).toBe(0);
    const insert =
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW())';
    await pool.query(insert, [tokenId, userId, tokenHash]);
    await expect(
      pool.query(insert, [randomUUID(), userId, tokenHash]),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('stores encrypted jobs uniquely and removes them with their user', async () => {
    const insert =
      "INSERT INTO email_jobs (id, user_id, reset_token_id, kind, idempotency_key, encrypted_payload, expires_at, updated_at) VALUES ($1, $2, $3, 'PASSWORD_RESET', $4, $5, NOW(), NOW())";
    await pool.query(insert, [
      jobId,
      userId,
      tokenId,
      jobKey,
      Buffer.from('ciphertext'),
    ]);
    await expect(
      pool.query(insert, [
        randomUUID(),
        userId,
        tokenId,
        jobKey,
        Buffer.from('ciphertext'),
      ]),
    ).rejects.toMatchObject({ code: '23505' });
    const job = await pool.query(
      'SELECT status, attempts, encrypted_payload FROM email_jobs WHERE id = $1',
      [jobId],
    );
    expect(job.rows[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      encrypted_payload: Buffer.from('ciphertext'),
    });
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    const remaining = await pool.query(
      'SELECT id FROM email_jobs WHERE id = $1',
      [jobId],
    );
    expect(remaining.rowCount).toBe(0);
    const tokens = await pool.query(
      'SELECT id FROM password_reset_tokens WHERE id = $1',
      [tokenId],
    );
    expect(tokens.rowCount).toBe(0);
  });
});
