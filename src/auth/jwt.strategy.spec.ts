import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { UserProfile } from './credentials.service';
import { extractAccessToken, JwtStrategy } from './jwt.strategy';

function authenticate(
  strategy: JwtStrategy,
  request: Request,
): Promise<UserProfile | null> {
  return new Promise((resolve, reject) => {
    strategy.success = (user: UserProfile) => resolve(user);
    strategy.fail = () => resolve(null);
    strategy.error = reject;
    strategy.authenticate(request);
  });
}

describe('access-token extraction', () => {
  it('reads the web access cookie when there is no Authorization header', () => {
    const request = {
      headers: { cookie: 'other=one; artwork_access=cookie.jwt; x=y' },
    } as Request;

    expect(extractAccessToken(request)).toBe('cookie.jwt');
  });

  it('prefers Bearer and never falls back to a cookie for malformed Authorization', () => {
    const bearer = {
      headers: {
        authorization: 'Bearer bearer.jwt',
        cookie: 'artwork_access=cookie.jwt',
      },
    } as Request;
    const malformed = {
      headers: {
        authorization: 'Basic credentials',
        cookie: 'artwork_access=cookie.jwt',
      },
    } as Request;

    expect(extractAccessToken(bearer)).toBe('bearer.jwt');
    expect(extractAccessToken(malformed)).toBeNull();
  });
});

describe('JwtStrategy', () => {
  const userId = '8d15334b-61d2-4aca-99b8-d633523d098b';
  const profile = {
    id: userId,
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
  };
  let findUnique: jest.Mock;
  let strategy: JwtStrategy;

  beforeEach(() => {
    findUnique = jest.fn().mockResolvedValue(profile);
    const prisma = { user: { findUnique } };
    const values: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
      JWT_ISSUER: 'artworkapp-api',
      JWT_AUDIENCE: 'artworkapp-clients',
    };
    const config = { getOrThrow: (key: string) => values[key] };
    strategy = new JwtStrategy(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('loads the current public user for a valid access payload', async () => {
    const result = await strategy.validate({
      sub: userId,
      purpose: 'access',
      jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    expect(result).toEqual(profile);
  });

  it('rejects refresh-purpose and malformed access payloads', async () => {
    await expect(
      strategy.validate({
        sub: userId,
        purpose: 'refresh',
        jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
      }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      strategy.validate({
        sub: 'not-a-uuid',
        purpose: 'access',
        jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a validly signed token after its user is deleted', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: userId,
        purpose: 'access',
        jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('authenticates a signed Bearer token and rejects an expired one', async () => {
    const jwt = new JwtService();
    const payload = {
      sub: userId,
      purpose: 'access',
      jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
    };
    const options = {
      secret: 'access-secret-with-at-least-32-characters',
      issuer: 'artworkapp-api',
      audience: 'artworkapp-clients',
    };
    const validToken = jwt.sign(payload, { ...options, expiresIn: 900 });
    const expiredToken = jwt.sign(payload, { ...options, expiresIn: -1 });

    await expect(
      authenticate(strategy, {
        headers: { authorization: `Bearer ${validToken}` },
      } as Request),
    ).resolves.toEqual(profile);
    await expect(
      authenticate(strategy, {
        headers: { authorization: `Bearer ${expiredToken}` },
      } as Request),
    ).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to a valid cookie when Bearer is invalid', async () => {
    const validCookie = new JwtService().sign(
      {
        sub: userId,
        purpose: 'access',
        jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
      },
      {
        secret: 'access-secret-with-at-least-32-characters',
        issuer: 'artworkapp-api',
        audience: 'artworkapp-clients',
        expiresIn: 900,
      },
    );

    await expect(
      authenticate(strategy, {
        headers: {
          authorization: 'Bearer invalid.jwt',
          cookie: `artwork_access=${validCookie}`,
        },
      } as Request),
    ).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
