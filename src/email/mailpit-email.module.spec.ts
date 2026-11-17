import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createTransport } from 'nodemailer';
import { MailpitEmailModule } from './mailpit-email.module';
import { MailpitEmailSender } from './mailpit-email.sender';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('MailpitEmailModule', () => {
  it('wires the sender to the configured Mailpit SMTP transport', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    jest
      .mocked(createTransport)
      .mockReturnValue({ sendMail } as unknown as ReturnType<
        typeof createTransport
      >);
    const values: Record<string, string | number> = {
      MAILPIT_SMTP_HOST: 'mailpit',
      MAILPIT_SMTP_PORT: 1025,
      FROM_EMAIL: 'dev@example.com',
    };
    const module = await Test.createTestingModule({
      imports: [MailpitEmailModule],
    })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: (key: string) => values[key] })
      .compile();

    await module.get(MailpitEmailSender).send({
      to: 'person@example.com',
      subject: 'Test',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'mailpit',
      port: 1025,
      secure: false,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'dev@example.com',
      to: 'person@example.com',
      subject: 'Test',
      text: 'Hello',
      html: '<p>Hello</p>',
    });
  });
});
