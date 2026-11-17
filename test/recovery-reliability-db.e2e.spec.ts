import { createHash, randomBytes, randomUUID } from 'crypto';
import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { AuthRateLimit } from '../src/auth/auth-rate-limit.guard';
import { RecoveryRateLimitGuard } from '../src/auth/recovery-rate-limit.guard';
import { WelcomeEmailService } from '../src/auth/welcome-email.service';
import { EmailJobService } from '../src/email/email-job.service';
import { EmailPayloadProtector } from '../src/email/email-payload-protector';

const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
class TestRoutes {
  @AuthRateLimit(2, 60000) request(): void {}
}

describeWithDatabase('recovery reliability on PostgreSQL', () => {
  const userId = randomUUID();
  const address = `test-${randomUUID()}`;
  const key = createHash('sha256')
    .update(`TestRoutes:request:${address}`)
    .digest('hex');
  let pool: Pool;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await pool.query(
      'INSERT INTO users (id, email, password_hash, updated_at, welcome_email_pending) VALUES ($1, $2, $3, NOW(), true)',
      [userId, `${userId}@example.test`, 'hash'],
    );
  });

  afterAll(async () => {
    if (pool) {
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        await pool.query('DELETE FROM recovery_rate_limits WHERE key = $1', [
          key,
        ]);
        await prisma?.$disconnect();
      } finally {
        await pool.end();
      }
    }
  });

  it('enforces the same limit concurrently across guard instances', async () => {
    const context = {
      getHandler: () => TestRoutes.prototype.request,
      getClass: () => TestRoutes,
      switchToHttp: () => ({ getRequest: () => ({ ip: address }) }),
    } as unknown as ExecutionContext;
    const guards = Array.from(
      { length: 4 },
      () =>
        new RecoveryRateLimitGuard(new Reflector(), prisma as PrismaService),
    );
    const results = await Promise.allSettled(
      guards.map((guard) => guard.canActivate(context)),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(2);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(2);
  });

  it('retains a failed welcome for retry and queues it once', async () => {
    const db = prisma as PrismaService;
    const jobs = new EmailJobService(
      new EmailPayloadProtector(randomBytes(32)),
      'test-key',
    );
    const service = new WelcomeEmailService(db, jobs);
    const user = {
      id: userId,
      email: `${userId}@example.test`,
      displayName: null,
      avatarUrl: null,
    };
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const enqueue = jest
      .spyOn(jobs, 'enqueue')
      .mockRejectedValueOnce(new Error('database failure'));
    await service.queue(user);
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))
        ?.welcomeEmailPending,
    ).toBe(true);
    enqueue.mockRestore();
    await Promise.all([service.queue(user), service.queue(user)]);
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))
        ?.welcomeEmailPending,
    ).toBe(false);
    expect(
      await prisma.emailJob.count({ where: { userId, kind: 'WELCOME' } }),
    ).toBe(1);
    log.mockRestore();
  });
});
