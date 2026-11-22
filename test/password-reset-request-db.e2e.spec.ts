import { randomBytes, randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { EmailJobService } from '../src/email/email-job.service';
import { EmailPayloadProtector } from '../src/email/email-payload-protector';
import { PasswordResetRequestService } from '../src/auth/password-reset-request.service';
import { PasswordResetTokenService } from '../src/auth/password-reset-token.service';

const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('password reset requests on PostgreSQL', () => {
  const userId = randomUUID();
  const email = `${userId}@example.test`;
  let pool: Pool;
  let prisma: PrismaClient;
  let jobs: EmailJobService;
  let tokens: PasswordResetTokenService;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    jobs = new EmailJobService(
      new EmailPayloadProtector(randomBytes(32)),
      'test-key',
    );
    tokens = new PasswordResetTokenService('https://example.test', 900);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at) VALUES ($1, $2, $3, NOW())',
      [userId, email, 'hash'],
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

  it('serializes concurrent requests so only one reset token remains active', async () => {
    const service = new PasswordResetRequestService(
      prisma as PrismaService,
      jobs,
      tokens,
    );
    await Promise.all([service.request(email), service.request(email)]);
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { userId },
    });
    const emailJobs = await prisma.emailJob.findMany({ where: { userId } });
    expect(resetTokens).toHaveLength(2);
    expect(
      resetTokens.filter((token) => token.invalidatedAt === null),
    ).toHaveLength(1);
    expect(emailJobs).toHaveLength(2);
    expect(emailJobs.every((job) => job.encryptedPayload !== null)).toBe(true);
  });

  it('rolls back token invalidation and creation if queueing fails', async () => {
    const before = await prisma.passwordResetToken.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
    const enqueue = jest
      .spyOn(jobs, 'enqueue')
      .mockRejectedValueOnce(new Error('queue failed'));
    const service = new PasswordResetRequestService(
      prisma as PrismaService,
      jobs,
      tokens,
    );
    await expect(service.request(email)).rejects.toThrow('queue failed');
    const after = await prisma.passwordResetToken.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
    expect(after).toEqual(before);
    enqueue.mockRestore();
  });
});
