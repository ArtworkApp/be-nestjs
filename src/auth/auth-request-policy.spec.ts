import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  allowedWebOrigins,
  assertAuthWriteRequest,
} from './auth-request-policy';

describe('auth write request policy', () => {
  function config(nodeEnv: string): ConfigService {
    const values: Record<string, string> = {
      NODE_ENV: nodeEnv,
      AUTH_WEB_ORIGINS: 'http://localhost:3000,https://app.example.com',
    };
    return {
      get: (key: string) => values[key],
      getOrThrow: (key: string) => values[key],
    } as ConfigService;
  }

  function request(headers: Record<string, string>, secure = false): Request {
    return { headers, secure } as Request;
  }

  it('parses the configured origins for credentialed CORS', () => {
    expect(allowedWebOrigins(config('development'))).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('accepts an allowed web JSON request in local development', () => {
    expect(() =>
      assertAuthWriteRequest(
        request({
          origin: 'http://localhost:3000',
          'content-type': 'application/json; charset=utf-8',
        }),
        'web',
        config('development'),
      ),
    ).not.toThrow();
  });

  it('rejects a missing or unapproved browser Origin', () => {
    for (const origin of [undefined, 'https://evil.example']) {
      expect(() =>
        assertAuthWriteRequest(
          request({
            ...(origin ? { origin } : {}),
            'content-type': 'application/json',
          }),
          'web',
          config('development'),
        ),
      ).toThrow();
    }
  });

  it('requires JSON on both web and mobile writes', () => {
    expect(() =>
      assertAuthWriteRequest(
        request({
          origin: 'http://localhost:3000',
          'content-type': 'text/plain',
        }),
        'web',
        config('development'),
      ),
    ).toThrow();
    expect(() =>
      assertAuthWriteRequest(
        request({ 'content-type': 'application/x-www-form-urlencoded' }),
        'mobile',
        config('development'),
      ),
    ).toThrow();
  });

  it('rejects browser headers on mobile transport', () => {
    expect(() =>
      assertAuthWriteRequest(
        request({
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
        }),
        'mobile',
        config('development'),
      ),
    ).toThrow();
    expect(() =>
      assertAuthWriteRequest(
        request({
          cookie: 'artwork_refresh=token',
          'content-type': 'application/json',
        }),
        'mobile',
        config('development'),
      ),
    ).toThrow();
  });

  it('requires HTTPS outside local development', () => {
    expect(() =>
      assertAuthWriteRequest(
        request({ 'content-type': 'application/json' }),
        'mobile',
        config('production'),
      ),
    ).toThrow();
    expect(() =>
      assertAuthWriteRequest(
        request({ 'content-type': 'application/json' }, true),
        'mobile',
        config('production'),
      ),
    ).not.toThrow();
  });
});
