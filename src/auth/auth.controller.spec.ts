import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { CredentialsService, UserProfile } from './credentials.service';
import { SessionService } from './session.service';

describe('AuthController register and login', () => {
  const user: UserProfile = {
    id: '8d15334b-61d2-4aca-99b8-d633523d098b',
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
  };
  const tokens = { accessToken: 'access.jwt', refreshToken: 'refresh.jwt' };
  let controller: AuthController;
  let credentials: { register: jest.Mock; verifyCredentials: jest.Mock };
  let sessions: { createSession: jest.Mock; refreshSession: jest.Mock };
  let response: { cookie: jest.Mock; setHeader: jest.Mock };

  function setup(nodeEnv: string, cookieDomain?: string): void {
    credentials = {
      register: jest.fn().mockResolvedValue(user),
      verifyCredentials: jest.fn().mockResolvedValue(user),
    };
    sessions = {
      createSession: jest.fn().mockResolvedValue(tokens),
      refreshSession: jest.fn().mockResolvedValue({ user, tokens }),
    };
    response = { cookie: jest.fn(), setHeader: jest.fn() };
    const values: Record<string, string | number> = {
      NODE_ENV: nodeEnv,
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_SECONDS: 2592000,
      ...(cookieDomain ? { AUTH_COOKIE_DOMAIN: cookieDomain } : {}),
    };
    const config = {
      get: (key: string) => values[key],
      getOrThrow: (key: string) => values[key],
    };
    controller = new AuthController(
      credentials as unknown as CredentialsService,
      sessions as unknown as SessionService,
      config as unknown as ConfigService,
    );
  }

  beforeEach(() => setup('development'));

  it('registers a web user and sends tokens only as local cookies', async () => {
    const result = await controller.register(
      { email: 'Person@Example.com', password: 'long-example-password' },
      response as unknown as Response,
    );

    expect(credentials.register).toHaveBeenCalledWith(
      'Person@Example.com',
      'long-example-password',
    );
    expect(sessions.createSession).toHaveBeenCalledWith(user.id);
    expect(result).toEqual({ user });
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'artwork_access',
      tokens.accessToken,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 900000,
      },
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'artwork_refresh',
      tokens.refreshToken,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 2592000000,
      },
    );
  });

  it('logs in a mobile user and returns tokens in JSON without cookies', async () => {
    const result = await controller.login(
      {
        email: 'person@example.com',
        password: 'long-example-password',
        client: 'mobile',
      },
      response as unknown as Response,
    );

    expect(credentials.verifyCredentials).toHaveBeenCalledWith(
      'person@example.com',
      'long-example-password',
    );
    expect(sessions.createSession).toHaveBeenCalledWith(user.id);
    expect(result).toEqual({ user, ...tokens });
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('sets Secure and parent Domain on production web cookies', async () => {
    setup('production', '.example.com');

    await controller.login(
      { email: 'person@example.com', password: 'long-example-password' },
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'artwork_access',
      tokens.accessToken,
      expect.objectContaining({
        secure: true,
        domain: '.example.com',
      }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'artwork_refresh',
      tokens.refreshToken,
      expect.objectContaining({
        secure: true,
        domain: '.example.com',
      }),
    );
  });

  it('does not write cookies if session creation fails', async () => {
    sessions.createSession.mockRejectedValue(new Error('database unavailable'));

    await expect(
      controller.login(
        { email: 'person@example.com', password: 'long-example-password' },
        response as unknown as Response,
      ),
    ).rejects.toThrow('database unavailable');
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('returns the current public profile without issuing new tokens', () => {
    const result = controller.me(user, response as unknown as Response);

    expect(result).toEqual({ user });
    expect(response.cookie).not.toHaveBeenCalled();
    expect(sessions.createSession).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('rotates a web refresh cookie and replaces both auth cookies', async () => {
    const request = {
      headers: { cookie: 'other=one; artwork_refresh=old.jwt' },
    } as Request;

    const result = await controller.refresh(
      request,
      {},
      response as unknown as Response,
    );

    expect(sessions.refreshSession).toHaveBeenCalledWith('old.jwt');
    expect(result).toEqual({ user });
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'artwork_access',
      tokens.accessToken,
      expect.any(Object),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'artwork_refresh',
      tokens.refreshToken,
      expect.any(Object),
    );
  });

  it('rotates a mobile refresh body and returns both tokens without cookies', async () => {
    const request = { headers: {} } as Request;

    const result = await controller.refresh(
      request,
      { refreshToken: 'old.jwt' },
      response as unknown as Response,
    );

    expect(sessions.refreshSession).toHaveBeenCalledWith('old.jwt');
    expect(result).toEqual({ user, ...tokens });
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('rejects mixed cookie and body refresh transport', async () => {
    const request = {
      headers: { cookie: 'artwork_refresh=cookie.jwt' },
    } as Request;

    await expect(
      controller.refresh(
        request,
        { refreshToken: 'body.jwt' },
        response as unknown as Response,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { error: { code: 'VALIDATION_ERROR' } },
    });
    expect(sessions.refreshSession).not.toHaveBeenCalled();
  });

  it('rejects a refreshToken field alongside a cookie even when the field is null', async () => {
    const request = {
      headers: { cookie: 'artwork_refresh=cookie.jwt' },
    } as Request;

    await expect(
      controller.refresh(
        request,
        { refreshToken: null },
        response as unknown as Response,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { error: { code: 'VALIDATION_ERROR' } },
    });
    expect(sessions.refreshSession).not.toHaveBeenCalled();
  });

  it('returns SESSION_EXPIRED when no refresh token is supplied', async () => {
    await expect(
      controller.refresh(
        { headers: {} } as Request,
        {},
        response as unknown as Response,
      ),
    ).rejects.toMatchObject({
      status: 401,
      response: { error: { code: 'SESSION_EXPIRED' } },
    });
    expect(sessions.refreshSession).not.toHaveBeenCalled();
  });
});
