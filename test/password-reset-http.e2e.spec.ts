import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { PasswordRecoveryModule } from '../src/auth/password-recovery.module';
import { PasswordResetRequestFacade } from '../src/auth/password-reset-request-facade';
import { PasswordResetConfirmService } from '../src/auth/password-reset-confirm.service';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

const describeWithHttp =
  process.env.AUTH_HTTP_TESTS === '1' ? describe : describe.skip;

describeWithHttp('password recovery HTTP contract', () => {
  let app: NestExpressApplication;
  const requests = { request: jest.fn().mockResolvedValue(undefined) };
  const confirmations = { confirm: jest.fn().mockResolvedValue(undefined) };
  const values: Record<string, string> = {
    NODE_ENV: 'development',
    AUTH_WEB_ORIGINS: 'http://localhost:3000',
    EMAIL_PAYLOAD_KEY: Buffer.alloc(32, 1).toString('base64'),
    EMAIL_PAYLOAD_KEY_ID: 'test-key',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PasswordRecoveryModule],
      providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => values[key],
        getOrThrow: (key: string) => values[key],
      })
      .overrideProvider(PasswordResetRequestFacade)
      .useValue(requests)
      .overrideProvider(PasswordResetConfirmService)
      .useValue(confirmations)
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
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('accepts requests with the generic message and no-store', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'person@example.com' })
      .expect(202);
    expect(result.body).toEqual({
      message:
        'If an account exists for this email address, a password reset link will be sent.',
    });
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it('returns an uncached validation error', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'bad' })
      .expect(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it('confirms with no response body', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', 'http://localhost:3000')
      .send({ token: 'a'.repeat(43), password: 'long-password' })
      .expect(204);
    expect(result.text).toBe('');
    expect(result.headers['cache-control']).toBe('no-store');
  });
});
