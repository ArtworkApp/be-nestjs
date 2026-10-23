import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './session.service';

describe('SessionService logout', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const tokenId = '2a1c1b2a-466e-4474-a658-e953cd478b26';
  const familyId = '62bb084f-57cb-4eba-a7fb-6e5557252c42';
  const now = new Date('2026-10-23T00:00:00.000Z');
  const secret = 'refresh-test-secret-with-at-least-32-characters';
  let service: SessionService;
  let token: string;
  let row: Record<string, unknown>;
  let findUnique: jest.Mock;
  let updateMany: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    token = new JwtService().sign(
      { sub: userId, purpose: 'refresh', jti: tokenId },
      {
        secret,
        issuer: 'artworkapp-api',
        audience: 'artworkapp-clients',
        expiresIn: 2592000,
      },
    );
    row = {
      id: tokenId,
      userId,
      familyId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(now.getTime() + 2592000 * 1000),
      revokedAt: null,
      replacedById: null,
    };
    findUnique = jest.fn().mockResolvedValue(row);
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { refreshToken: { findUnique, updateMany } };
    const values: Record<string, string | number> = {
      JWT_REFRESH_SECRET: secret,
      JWT_ISSUER: 'artworkapp-api',
      JWT_AUDIENCE: 'artworkapp-clients',
    };
    const config = { getOrThrow: (key: string) => values[key] };
    service = new SessionService(
      prisma as unknown as PrismaService,
      new JwtService(),
      config as unknown as ConfigService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('revokes the active rows in only the presented login family', async () => {
    await expect(service.logoutSession(token)).resolves.toBeUndefined();

    expect(findUnique).toHaveBeenCalledWith({ where: { id: tokenId } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  });

  it('rejects a missing row or mismatched token hash without revoking a family', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(service.logoutSession(token)).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    row.tokenHash = 'not-this-token';
    await expect(service.logoutSession(token)).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects expired tokens and rows', async () => {
    const expired = new JwtService().sign(
      { sub: userId, purpose: 'refresh', jti: tokenId },
      {
        secret,
        issuer: 'artworkapp-api',
        audience: 'artworkapp-clients',
        expiresIn: -1,
      },
    );
    await expect(service.logoutSession(expired)).rejects.toMatchObject({
      status: 401,
    });
    expect(findUnique).not.toHaveBeenCalled();

    row.expiresAt = new Date(now.getTime() - 1);
    await expect(service.logoutSession(token)).rejects.toMatchObject({
      status: 401,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('treats a rotated token as replay and revokes its family', async () => {
    row.revokedAt = now;
    row.replacedById = '70436c9d-1b7b-436a-b103-3d9c5046cf5e';

    await expect(service.logoutSession(token)).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
});
