import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';

describe('SessionService initial issuance', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const accessSecret = 'access-test-secret-with-at-least-32-characters';
  const refreshSecret = 'refresh-test-secret-with-at-least-32-characters';
  const issuer = 'artworkapp-api';
  const audience = 'artworkapp-clients';
  const now = new Date('2026-10-23T00:00:00.000Z');
  let service: SessionService;
  let jwt: JwtService;
  let createTokenRow: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    createTokenRow = jest.fn().mockResolvedValue({});
    const prisma = { refreshToken: { create: createTokenRow } };
    const values: Record<string, string | number> = {
      JWT_ACCESS_SECRET: accessSecret,
      JWT_REFRESH_SECRET: refreshSecret,
      JWT_ISSUER: issuer,
      JWT_AUDIENCE: audience,
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_SECONDS: 2592000,
    };
    const config = {
      getOrThrow: (key: string) => values[key],
    };
    jwt = new JwtService();
    service = new SessionService(
      prisma as unknown as PrismaService,
      jwt,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('signs separate purpose-bound JWTs and persists only the refresh hash', async () => {
    const tokens = await service.createSession(userId);
    const access = await jwt.verifyAsync(tokens.accessToken, {
      secret: accessSecret,
      issuer,
      audience,
    });
    const refresh = await jwt.verifyAsync(tokens.refreshToken, {
      secret: refreshSecret,
      issuer,
      audience,
    });

    expect(access).toMatchObject({ sub: userId, purpose: 'access' });
    expect(refresh).toMatchObject({ sub: userId, purpose: 'refresh' });
    expect(access.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(refresh.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(access.jti).not.toBe(refresh.jti);
    expect(access.exp - access.iat).toBe(900);
    expect(refresh.exp - refresh.iat).toBe(2592000);
    await expect(
      jwt.verifyAsync(tokens.accessToken, { secret: refreshSecret }),
    ).rejects.toThrow();
    await expect(
      jwt.verifyAsync(tokens.refreshToken, { secret: accessSecret }),
    ).rejects.toThrow();

    expect(createTokenRow).toHaveBeenCalledWith({
      data: {
        id: refresh.jti,
        userId,
        familyId: expect.any(String),
        tokenHash: createHash('sha256')
          .update(tokens.refreshToken)
          .digest('hex'),
        expiresAt: new Date(now.getTime() + 2592000 * 1000),
      },
    });
    const row = createTokenRow.mock.calls[0][0].data;
    expect(row.tokenHash).not.toBe(tokens.refreshToken);
    expect(row.familyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('starts an independent family for every login by the same user', async () => {
    await service.createSession(userId);
    await service.createSession(userId);

    const first = createTokenRow.mock.calls[0][0].data;
    const second = createTokenRow.mock.calls[1][0].data;
    expect(first.familyId).not.toBe(second.familyId);
    expect(first.id).not.toBe(second.id);
  });

  it('does not return tokens if the refresh row cannot be stored', async () => {
    createTokenRow.mockRejectedValue(new Error('database unavailable'));

    await expect(service.createSession(userId)).rejects.toThrow(
      'database unavailable',
    );
  });
});
