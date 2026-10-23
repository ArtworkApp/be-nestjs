import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import {
  AuthRateLimit,
  AuthRateLimitGuard,
  AUTH_RATE_LIMIT_KEY,
} from './auth-rate-limit.guard';

class TestRoutes {
  @AuthRateLimit(2, 60000)
  login(): void {}

  @AuthRateLimit(2, 60000)
  register(): void {}
}

describe('AuthRateLimitGuard', () => {
  let guard: AuthRateLimitGuard;
  let currentTime: number;

  function context(handler: () => void, ip = '192.0.2.1'): ExecutionContext {
    const request = {
      ip,
      headers: { 'x-forwarded-for': 'untrusted-spoofed-ip' },
    } as unknown as Request;
    return {
      getHandler: () => handler,
      getClass: () => TestRoutes,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    currentTime = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    guard = new AuthRateLimitGuard(new Reflector());
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns 429 RATE_LIMITED after the route limit', () => {
    const login = context(TestRoutes.prototype.login);

    expect(guard.canActivate(login)).toBe(true);
    expect(guard.canActivate(login)).toBe(true);
    expect(() => guard.canActivate(login)).toThrow();
    try {
      guard.canActivate(login);
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        response: { error: { code: 'RATE_LIMITED' } },
      });
    }
  });

  it('keeps IP addresses and routes separate and resets after the window', () => {
    const login = context(TestRoutes.prototype.login);
    guard.canActivate(login);
    guard.canActivate(login);

    expect(
      guard.canActivate(context(TestRoutes.prototype.login, '192.0.2.2')),
    ).toBe(true);
    expect(guard.canActivate(context(TestRoutes.prototype.register))).toBe(
      true,
    );
    currentTime += 60001;
    expect(guard.canActivate(login)).toBe(true);
  });

  it('sets different limits on registration, login, and refresh', () => {
    const reflector = new Reflector();

    expect(
      reflector.get(AUTH_RATE_LIMIT_KEY, AuthController.prototype.register),
    ).toEqual({
      limit: 5,
      windowMs: 60000,
    });
    expect(
      reflector.get(AUTH_RATE_LIMIT_KEY, AuthController.prototype.login),
    ).toEqual({
      limit: 10,
      windowMs: 60000,
    });
    expect(
      reflector.get(AUTH_RATE_LIMIT_KEY, AuthController.prototype.refresh),
    ).toEqual({
      limit: 30,
      windowMs: 60000,
    });
  });
});
