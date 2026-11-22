import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { EmailJobService } from '../src/email/email-job.service';
import { EmailPayloadProtector } from '../src/email/email-payload-protector';
import { PasswordResetConfirmService } from '../src/auth/password-reset-confirm.service';
import { SessionService } from '../src/auth/session.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';

const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('password reset confirmation on PostgreSQL', () => {
  const userId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const values: Record<string, string | number> = {
    JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
    JWT_ISSUER: 'artworkapp-api',
    JWT_AUDIENCE: 'artworkapp-clients',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 2592000,
  };
  const config = {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
  let pool: Pool;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, `${userId}@example.test`, 'old-hash'],
    );
    await pool.query(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')",
      [randomUUID(), userId, createHash('sha256').update(token).digest('hex')],
    );
  });

  afterAll(async () => {
    if (pool) {
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        await prisma?.$disconnect();
      } finally {
        await pool.end();
      }
    }
  });

  it('allows only one confirmation and invalidates prior sessions and a stale login', async () => {
    const db = prisma as PrismaService;
    const jwt = new JwtService();
    const sessions = new SessionService(db, jwt, config);
    const previous = await sessions.createSession(userId, 0);
    const jobs = new EmailJobService(
      new EmailPayloadProtector(randomBytes(32)),
      'test-key',
    );
    const confirmations = new PasswordResetConfirmService(db, jobs);
    const results = await Promise.allSettled([
      confirmations.confirm(token, 'new-password-one'),
      confirmations.confirm(token, 'new-password-two'),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.user.findUnique({
        where: { id: userId },
        select: { sessionVersion: true },
      }),
    ).toEqual({ sessionVersion: 1 });
    expect(
      await prisma.refreshToken.count({ where: { userId, revokedAt: null } }),
    ).toBe(0);
    expect(
      await prisma.emailJob.count({
        where: { userId, kind: 'PASSWORD_CHANGED' },
      }),
    ).toBe(1);
    await expect(sessions.createSession(userId, 0)).rejects.toMatchObject({
      status: 401,
    });
    const oldClaims = jwt.decode(previous.accessToken) as {
      sub: string;
      purpose: string;
      jti: string;
      sessionVersion: number;
    };
    await expect(
      new JwtStrategy(db, config).validate(oldClaims),
    ).rejects.toMatchObject({ status: 401 });
    await expect(sessions.createSession(userId, 1)).resolves.toHaveProperty(
      'accessToken',
    );
  });
});
