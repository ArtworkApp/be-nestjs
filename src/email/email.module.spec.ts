import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailSender } from './email-sender';
import { EmailModule } from './email.module';
import { MAILPIT_TRANSPORT, MailpitEmailSender } from './mailpit-email.sender';
import { SES_EMAIL_CLIENT, SesEmailSender } from './ses-email.sender';

describe('EmailModule', () => {
  it.each([
    { transport: 'mailpit', expected: MailpitEmailSender },
    { transport: 'ses', expected: SesEmailSender },
  ])('selects the $transport sender', async ({ transport, expected }) => {
    const settings: Record<string, string | number> = {
      EMAIL_TRANSPORT: transport,
      FROM_EMAIL: 'accounts@example.com',
      AWS_REGION: 'us-east-1',
      MAILPIT_SMTP_HOST: 'mailpit',
      MAILPIT_SMTP_PORT: 1025,
    };
    const module = await Test.createTestingModule({ imports: [EmailModule] })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: (key: string) => settings[key] })
      .overrideProvider(MAILPIT_TRANSPORT)
      .useValue({ sendMail: jest.fn() })
      .overrideProvider(SES_EMAIL_CLIENT)
      .useValue({ send: jest.fn() })
      .compile();

    expect(module.get(EmailSender)).toBeInstanceOf(expected);
  });
});
