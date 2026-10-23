import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AuthModule } from '../src/auth/auth.module';
import { CredentialsService } from '../src/auth/credentials.service';
import { SessionService } from '../src/auth/session.service';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

const describeWithHttp =
  process.env.AUTH_HTTP_TESTS === '1' ? describe : describe.skip;

describeWithHttp('auth HTTP contract (e2e)', () => {
  const user = {
    id: '8d15334b-61d2-4aca-99b8-d633523d098b',
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
  };
  const jwt = new JwtService();
  const accessToken = jwt.sign(
    {
      sub: user.id,
      purpose: 'access',
      jti: '5f95620d-6969-4022-bb02-44e87af2a77a',
    },
    {
      secret: 'access-test-secret-with-at-least-32-characters',
      issuer: 'artworkapp-api',
      audience: 'artworkapp-clients',
      expiresIn: 900,
    },
  );
  const tokens = { accessToken, refreshToken: 'refresh.jwt' };
  const credentials = {
    register: jest.fn().mockResolvedValue(user),
    verifyCredentials: jest.fn().mockResolvedValue(user),
  };
  const sessions = {
    createSession: jest.fn().mockResolvedValue(tokens),
    refreshSession: jest.fn().mockResolvedValue({ user, tokens }),
    logoutSession: jest.fn().mockResolvedValue(undefined),
  };
  const values: Record<string, string | number> = {
    NODE_ENV: 'development',
    AUTH_WEB_ORIGINS: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'access-test-secret-with-at-least-32-characters',
    JWT_ISSUER: 'artworkapp-api',
    JWT_AUDIENCE: 'artworkapp-clients',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 2592000,
  };
  let app: NestExpressApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique: jest.fn().mockResolvedValue(user) } })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => values[key],
        getOrThrow: (key: string) => values[key],
      })
      .overrideProvider(CredentialsService)
      .useValue(credentials)
      .overrideProvider(SessionService)
      .useValue(sessions)
      .compile();

    app = module.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableCors({ origin: ['http://localhost:3000'], credentials: true });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers web with public JSON and two HttpOnly cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Origin', 'http://localhost:3000')
      .send({ email: user.email, password: 'long-example-password' })
      .expect(201);

    expect(response.body).toEqual({ user });
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][1]).toContain('HttpOnly');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns tokens in mobile login JSON and no auth cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: 'long-example-password',
        client: 'mobile',
      })
      .expect(200);

    expect(response.body).toEqual({ user, ...tokens });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('returns the current user from a valid Bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ user });
  });

  it('rejects an unapproved web Origin in the shared error format', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: user.email, password: 'long-example-password' })
      .expect(403);

    expect(response.body).toMatchObject({
      error: { code: 'ORIGIN_NOT_ALLOWED' },
    });
  });

  it('validates auth payloads in the shared error format', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('rotates by cookie and logs out by mobile body', async () => {
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', 'artwork_refresh=old.jwt')
      .send({})
      .expect(200);
    expect(refreshed.body).toEqual({ user });
    expect(refreshed.headers['set-cookie']).toHaveLength(2);

    const loggedOut = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'refresh.jwt' })
      .expect(204);
    expect(loggedOut.text).toBe('');
  });
});
