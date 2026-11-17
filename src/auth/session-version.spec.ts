import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { SessionService } from './session.service';

describe('session version', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const claims = {
    sub: userId,
    purpose: 'access',
    jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
  };
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

  it('includes the current version in new access tokens', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ sessionVersion: 3 }) },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const jwt = new JwtService();
    const service = new SessionService(
      prisma as unknown as PrismaService,
      jwt,
      config,
    );
    const tokens = await service.createSession(userId);
    expect(jwt.decode(tokens.accessToken)).toMatchObject({ sessionVersion: 3 });
  });

  it('rejects an old token after the session version changes', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          email: 'person@example.com',
          displayName: null,
          avatarUrl: null,
          sessionVersion: 2,
        }),
      },
    };
    const strategy = new JwtStrategy(
      prisma as unknown as PrismaService,
      config,
    );
    await expect(
      strategy.validate({ ...claims, sessionVersion: 1 }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(strategy.validate(claims)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      strategy.validate({ ...claims, sessionVersion: 2 }),
    ).resolves.toEqual({
      id: userId,
      email: 'person@example.com',
      displayName: null,
      avatarUrl: null,
    });
  });
});
