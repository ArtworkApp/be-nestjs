import { randomBytes, randomUUID } from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { createTransport } from 'nodemailer';
import { PrismaService } from '../src/database/prisma.service';
import { EmailJobReaderService } from '../src/email/email-job-reader.service';
import { EmailWorkerLauncher } from '../src/email/email-worker-launcher';

const enabled = process.env.RECOVERY_MAILPIT_E2E === '1';
const describeWithMailpit = enabled ? describe : describe.skip;
const databaseUrl = process.env.AUTH_SCHEMA_TEST_DATABASE_URL;

describeWithMailpit('password recovery through Mailpit', () => {
  const email = `recovery-${randomUUID()}@example.test`;
  const oldPassword = `old-${randomUUID()}`;
  const newPassword = `new-${randomUUID()}`;
  const origin = 'http://localhost:3000';
  const originalEnvironment = { ...process.env };
  let app: NestExpressApplication;

  beforeAll(async () => {
    if (!databaseUrl)
      throw new Error('AUTH_SCHEMA_TEST_DATABASE_URL is required.');
    Object.assign(process.env, {
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'development',
      AUTH_WEB_ORIGINS: origin,
      PASSWORD_RESET_WEB_ORIGIN: origin,
      EMAIL_TRANSPORT: 'mailpit',
      MAILPIT_SMTP_HOST: 'mailpit',
      MAILPIT_SMTP_PORT: '1025',
      EMAIL_WORKER_MODE: 'local',
      EMAIL_WORKER_POLL_INTERVAL_MS: '200',
      EMAIL_PAYLOAD_KEY: randomBytes(32).toString('base64'),
      EMAIL_PAYLOAD_KEY_ID: 'mailpit-test-key',
    });
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.get(PrismaService).user.deleteMany({ where: { email } });
        await app.close();
      }
    } finally {
      process.env = originalEnvironment;
    }
  });

  it('sends a reset link and invalidates previous credentials and sessions', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: oldPassword, client: 'mobile' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', origin)
      .send({ email })
      .expect(202);
    const token = await findResetToken(email, app);
    await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', origin)
      .send({ token, password: newPassword })
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registration.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: oldPassword, client: 'mobile' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword, client: 'mobile' })
      .expect(200);
  }, 30000);
});

async function findResetToken(
  email: string,
  app: NestExpressApplication,
): Promise<string> {
  const query = new URLSearchParams({ query: `to:${email} subject:Reset` });
  const url = `http://mailpit:8025/view/latest.txt?${query}`;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await fetch(url);
    lastStatus = response.status;
    if (response.ok) {
      const body = await response.text();
      const token = /#token=([A-Za-z0-9_-]{43})/.exec(body)?.[1];
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const prisma = app.get(PrismaService);
  const jobs = await prisma.emailJob.findMany({
    where: { user: { email } },
    select: { kind: true, status: true, attempts: true, lastErrorCode: true },
  });
  const tokenCount = await prisma.passwordResetToken.count({
    where: { user: { email } },
  });
  const resetJob = await prisma.emailJob.findFirst({
    where: { user: { email }, kind: 'PASSWORD_RESET' },
    select: { payloadKeyId: true, encryptedPayload: true },
  });
  let payloadReadable = false;
  let workerPayloadReadable = false;
  try {
    if (resetJob) {
      app.get(EmailJobReaderService).read(resetJob);
      payloadReadable = true;
    }
  } catch {
    // Report only whether decryption worked; do not print email content.
  }
  try {
    const launcher = app.get(EmailWorkerLauncher) as unknown as {
      context?: {
        get: (type: typeof EmailJobReaderService) => EmailJobReaderService;
      };
    };
    if (resetJob && launcher.context) {
      launcher.context.get(EmailJobReaderService).read(resetJob);
      workerPayloadReadable = true;
    }
  } catch {
    // The worker's reader is checked without exposing its key or message.
  }
  const smtpStatus = await checkMailpitSmtp();
  throw new Error(
    `Timed out waiting for the reset email. Mailpit HTTP status: ${lastStatus}; SMTP: ${smtpStatus}; API payload readable: ${payloadReadable}; worker payload readable: ${workerPayloadReadable}; reset records: ${tokenCount}; jobs: ${JSON.stringify(
      jobs,
    )}`,
  );
}

async function checkMailpitSmtp(): Promise<string> {
  const transport = createTransport({
    host: 'mailpit',
    port: 1025,
    connectionTimeout: 2500,
    greetingTimeout: 2500,
    socketTimeout: 2500,
  });
  try {
    await transport.verify();
    return 'reachable';
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    return typeof code === 'string' &&
      ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ESOCKET', 'EAUTH'].includes(
        code,
      )
      ? code
      : 'unavailable';
  } finally {
    transport.close();
  }
}
