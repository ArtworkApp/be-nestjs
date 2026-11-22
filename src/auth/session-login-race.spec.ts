import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';

describe('login and password reset concurrency', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const values: Record<string, string | number> = {
    JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
    JWT_ISSUER: 'artworkapp-api',
    JWT_AUDIENCE: 'artworkapp-clients',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 2592000,
  };

  it('rejects a login verified before the user session version changed', async () => {
    const create = jest.fn();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ sessionVersion: 2 }]),
      refreshToken: { create },
    };
    const prisma = {
      $transaction: jest.fn((work) => work(tx)),
    } as unknown as PrismaService;
    const config = {
      getOrThrow: (key: string) => values[key],
    } as unknown as ConfigService;
    const sessions = new SessionService(prisma, new JwtService(), config);

    await expect(sessions.createSession(userId, 1)).rejects.toMatchObject({
      status: 401,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
