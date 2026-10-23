import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma.service';
import { SessionService } from '../src/auth/session.service';

// Run only against an isolated database with the checked-in migrations applied.
const testDatabaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase('authentication sessions on PostgreSQL', () => {
  const userIds: string[] = [];
  const values: Record<string, string | number> = {
    JWT_ACCESS_SECRET: 'access-test-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-test-secret-with-at-least-32-characters',
    JWT_ISSUER: 'artworkapp-api',
    JWT_AUDIENCE: 'artworkapp-clients',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 2592000,
  };
  let previousDatabaseUrl: string | undefined;
  let prisma: PrismaService;
  let sessions: SessionService;

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sessions = new SessionService(prisma, new JwtService(), {
      getOrThrow: (key: string) => values[key],
    } as ConfigService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('permits one refresh winner, revokes its replayed family, and preserves another login', async () => {
    const userId = randomUUID();
    userIds.push(userId);
    await prisma.user.create({
      data: {
        id: userId,
        email: `auth-session-${userId}@example.test`,
        passwordHash: 'test-hash',
      },
    });

    const firstLogin = await sessions.createSession(userId);
    const secondLogin = await sessions.createSession(userId);
    const outcomes = await Promise.allSettled([
      sessions.refreshSession(firstLogin.refreshToken),
      sessions.refreshSession(firstLogin.refreshToken),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);
    await expect(
      sessions.refreshSession(firstLogin.refreshToken),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      sessions.refreshSession(secondLogin.refreshToken),
    ).resolves.toHaveProperty('tokens.refreshToken');
  });
});
