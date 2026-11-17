import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { EmailSender } from './email-sender';
import { EmailWorkerService } from './email-worker.service';
import { EmailWorkerRuntimeModule } from './email-worker-runtime.module';
import { MAILPIT_TRANSPORT } from './mailpit-email.sender';
import { SES_EMAIL_CLIENT } from './ses-email.sender';
import { EmailJobReaderService } from './email-job-reader.service';

describe('EmailWorkerRuntimeModule', () => {
  it('constructs a worker with configured dependencies', async () => {
    const values: Record<string, string | number> = {
      EMAIL_PAYLOAD_KEY: randomBytes(32).toString('base64'),
      EMAIL_PAYLOAD_KEY_ID: 'key-1',
      EMAIL_WORKER_MODE: 'local',
      NODE_ENV: 'development',
      EMAIL_TRANSPORT: 'mailpit',
      FROM_EMAIL: 'test@example.com',
      MAILPIT_SMTP_HOST: 'mailpit',
      MAILPIT_SMTP_PORT: 1025,
      AWS_REGION: 'us-east-1',
    };
    const module = await Test.createTestingModule({
      imports: [EmailWorkerRuntimeModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => values[key],
        getOrThrow: (key: string) => values[key],
      })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(EmailSender)
      .useValue({ send: jest.fn() })
      .overrideProvider(MAILPIT_TRANSPORT)
      .useValue({ sendMail: jest.fn() })
      .overrideProvider(SES_EMAIL_CLIENT)
      .useValue({ send: jest.fn() })
      .compile();

    expect(module.get(EmailWorkerService)).toBeInstanceOf(EmailWorkerService);
    await module.close();
  });

  it('waits for the job reader before constructing the worker', async () => {
    const values: Record<string, string | number> = {
      EMAIL_PAYLOAD_KEY: randomBytes(32).toString('base64'),
      EMAIL_PAYLOAD_KEY_ID: 'key-1',
      EMAIL_WORKER_MODE: 'local',
      NODE_ENV: 'development',
      EMAIL_TRANSPORT: 'mailpit',
      FROM_EMAIL: 'test@example.com',
      MAILPIT_SMTP_HOST: 'mailpit',
      MAILPIT_SMTP_PORT: 1025,
      AWS_REGION: 'us-east-1',
    };
    const reader = {
      read: jest.fn().mockReturnValue({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
        html: 'Test',
      }),
    };
    const sender = { send: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      recoveryRateLimit: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'job', leaseId: 'lease' }]),
      emailJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'job', attempts: 1 }),
      },
    };
    const module = await Test.createTestingModule({
      imports: [EmailWorkerRuntimeModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => values[key],
        getOrThrow: (key: string) => values[key],
      })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EmailJobReaderService)
      .useFactory({
        factory: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return reader;
        },
      })
      .overrideProvider(EmailSender)
      .useValue(sender)
      .overrideProvider(MAILPIT_TRANSPORT)
      .useValue({ sendMail: jest.fn() })
      .overrideProvider(SES_EMAIL_CLIENT)
      .useValue({ send: jest.fn() })
      .compile();

    await module.get(EmailWorkerService).runOnce();
    expect(reader.read).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledTimes(1);
    await module.close();
  });
});
