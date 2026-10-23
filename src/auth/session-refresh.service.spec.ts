import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';

describe('SessionService refresh rotation', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const tokenId = '2a1c1b2a-466e-4474-a658-e953cd478b26';
  const familyId = '62bb084f-57cb-4eba-a7fb-6e5557252c42';
  const now = new Date('2026-10-23T00:00:00.000Z');
  const refreshSecret = 'refresh-test-secret-with-at-least-32-characters';
  const issuer = 'artworkapp-api';
  const audience = 'artworkapp-clients';
  const user = {
    id: userId,
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
  };
  let service: SessionService;
  let jwt: JwtService;
  let oldToken: string;
  let row: Record<string, unknown>;
  let findUnique: jest.Mock;
  let updateOld: jest.Mock;
  let createSuccessor: jest.Mock;
  let revokeFamily: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    jwt = new JwtService();
    oldToken = jwt.sign(
      { sub: userId, purpose: 'refresh', jti: tokenId },
      { secret: refreshSecret, issuer, audience, expiresIn: 2592000 },
    );
    row = {
      id: tokenId,
      userId,
      familyId,
      tokenHash: createHash('sha256').update(oldToken).digest('hex'),
      expiresAt: new Date(now.getTime() + 2592000 * 1000),
      revokedAt: null,
      replacedById: null,
      user,
    };
    findUnique = jest.fn().mockResolvedValue(row);
    updateOld = jest.fn().mockResolvedValue({ count: 1 });
    createSuccessor = jest.fn().mockResolvedValue({});
    revokeFamily = jest.fn().mockResolvedValue({ count: 1 });
    transaction = jest.fn((callback) =>
      callback({
        refreshToken: { updateMany: updateOld, create: createSuccessor },
      }),
    );
    const prisma = {
      refreshToken: { findUnique, updateMany: revokeFamily },
      $transaction: transaction,
    };
    const values: Record<string, string | number> = {
      JWT_ACCESS_SECRET: 'access-test-secret-with-at-least-32-characters',
      JWT_REFRESH_SECRET: refreshSecret,
      JWT_ISSUER: issuer,
      JWT_AUDIENCE: audience,
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_SECONDS: 2592000,
    };
    const config = { getOrThrow: (key: string) => values[key] };
    service = new SessionService(
      prisma as unknown as PrismaService,
      jwt,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('conditionally revokes the old row and inserts its successor in one transaction', async () => {
    const result = await service.refreshSession(oldToken);
    const successor = await jwt.verifyAsync(result.tokens.refreshToken, {
      secret: refreshSecret,
      issuer,
      audience,
    });
    const access = await jwt.verifyAsync(result.tokens.accessToken, {
      secret: 'access-test-secret-with-at-least-32-characters',
      issuer,
      audience,
    });

    expect(result.user).toEqual(user);
    expect(access).toMatchObject({ sub: userId, purpose: 'access' });
    expect(successor).toMatchObject({ sub: userId, purpose: 'refresh' });
    expect(successor.jti).not.toBe(tokenId);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateOld).toHaveBeenCalledWith({
      where: {
        id: tokenId,
        userId,
        tokenHash: row.tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now, replacedById: successor.jti },
    });
    expect(createSuccessor).toHaveBeenCalledWith({
      data: {
        id: successor.jti,
        userId,
        familyId,
        tokenHash: createHash('sha256')
          .update(result.tokens.refreshToken)
          .digest('hex'),
        expiresAt: new Date(now.getTime() + 2592000 * 1000),
      },
    });
    expect(revokeFamily).not.toHaveBeenCalled();
  });

  it('treats a rotated token as replay and revokes only its family', async () => {
    row.revokedAt = now;
    row.replacedById = '70436c9d-1b7b-436a-b103-3d9c5046cf5e';

    await expect(service.refreshSession(oldToken)).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    expect(revokeFamily).toHaveBeenCalledWith({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects expired JWTs before querying the database', async () => {
    const expired = jwt.sign(
      { sub: userId, purpose: 'refresh', jti: tokenId },
      { secret: refreshSecret, issuer, audience, expiresIn: -1 },
    );

    await expect(service.refreshSession(expired)).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token whose database row is expired or has a different hash', async () => {
    row.expiresAt = new Date(now.getTime() - 1);
    await expect(service.refreshSession(oldToken)).rejects.toMatchObject({
      status: 401,
    });
    row.expiresAt = new Date(now.getTime() + 1000);
    row.tokenHash = 'not-the-token-hash';
    await expect(service.refreshSession(oldToken)).rejects.toMatchObject({
      status: 401,
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(revokeFamily).not.toHaveBeenCalled();
  });

  it('allows one concurrent refresh to win and revokes that family after replay', async () => {
    updateOld
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.allSettled([
      service.refreshSession(oldToken),
      service.refreshSession(oldToken),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(createSuccessor).toHaveBeenCalledTimes(1);
    expect(revokeFamily).toHaveBeenCalledWith({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
});
