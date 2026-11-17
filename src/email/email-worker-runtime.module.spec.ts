import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { EmailSender } from './email-sender';
import { EmailWorkerService } from './email-worker.service';
import { EmailWorkerRuntimeModule } from './email-worker-runtime.module';
import { MAILPIT_TRANSPORT } from './mailpit-email.sender';
import { SES_EMAIL_CLIENT } from './ses-email.sender';

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
});
