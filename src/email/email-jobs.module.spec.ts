import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailJobService } from './email-job.service';
import { EmailJobsModule } from './email-jobs.module';
import { EmailPayloadProtector } from './email-payload-protector';

describe('EmailJobsModule', () => {
  const key = randomBytes(32).toString('base64');

  async function createModule(settings: Record<string, string>) {
    return Test.createTestingModule({ imports: [EmailJobsModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (name: string) => settings[name] })
      .compile();
  }

  it('creates the job service and payload protector from a configured key', async () => {
    const module = await createModule({
      EMAIL_PAYLOAD_KEY: key,
      EMAIL_PAYLOAD_KEY_ID: 'key-1',
    });
    expect(module.get(EmailJobService)).toBeInstanceOf(EmailJobService);
    const protector = module.get(EmailPayloadProtector);
    expect(protector.decrypt(protector.encrypt('message'))).toBe('message');
    await module.close();
  });

  it.each([
    {},
    { EMAIL_PAYLOAD_KEY: key },
    { EMAIL_PAYLOAD_KEY: 'invalid', EMAIL_PAYLOAD_KEY_ID: 'key-1' },
    {
      EMAIL_PAYLOAD_KEY: randomBytes(31).toString('base64'),
      EMAIL_PAYLOAD_KEY_ID: 'key-1',
    },
    { EMAIL_PAYLOAD_KEY: key, EMAIL_PAYLOAD_KEY_ID: '   ' },
  ])('rejects missing or invalid key configuration', async (settings) => {
    await expect(createModule(settings)).rejects.toThrow();
  });
});
