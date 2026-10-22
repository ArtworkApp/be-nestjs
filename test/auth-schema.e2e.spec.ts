import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// Only an isolated, already-migrated database belongs in this variable.
const testDatabaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const insertRefreshTokenSql =
  "INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day')";

describeWithDatabase('authentication schema on PostgreSQL', () => {
  let pool: Pool;
  const userIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString: testDatabaseUrl });
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
        userIds,
      ]);
      await pool.end();
    }
  });

  it('enforces required email/password and unique email', async () => {
    const userId = randomUUID();
    userIds.push(userId);
    const email = `auth-schema-${userId}@example.test`;

    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, email, 'hash'],
    );

    await expect(
      pool.query(
        'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
        [randomUUID(), email, 'other-hash'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        'INSERT INTO users (id, password_hash, updated_at) VALUES ($1, $2, NOW())',
        [randomUUID(), 'hash'],
      ),
    ).rejects.toMatchObject({ code: '23502' });
    await expect(
      pool.query(
        'INSERT INTO users (id, email, updated_at) VALUES ($1, $2, NOW())',
        [randomUUID(), `missing-password-${userId}@example.test`],
      ),
    ).rejects.toMatchObject({ code: '23502' });
  });

  it('stores rotation/revocation data and cascades token deletion with its user', async () => {
    const userId = randomUUID();
    const tokenId = randomUUID();
    const familyId = randomUUID();
    const hash = `hash-${tokenId}`;
    userIds.push(userId);

    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, `auth-schema-${userId}@example.test`, 'hash'],
    );
    await pool.query(insertRefreshTokenSql, [tokenId, userId, familyId, hash]);

    await expect(
      pool.query(insertRefreshTokenSql, [randomUUID(), userId, familyId, hash]),
    ).rejects.toMatchObject({ code: '23505' });

    const revokedAt = new Date();
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = $1, replaced_by_id = $2 WHERE id = $3',
      [revokedAt, randomUUID(), tokenId],
    );
    const token = await pool.query(
      'SELECT family_id, revoked_at, replaced_by_id FROM refresh_tokens WHERE id = $1',
      [tokenId],
    );
    expect(token.rows[0]).toMatchObject({ family_id: familyId });
    expect(token.rows[0].revoked_at).toBeInstanceOf(Date);
    expect(token.rows[0].replaced_by_id).toBeTruthy();

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    const remaining = await pool.query(
      'SELECT id FROM refresh_tokens WHERE id = $1',
      [tokenId],
    );
    expect(remaining.rowCount).toBe(0);
  });
});
