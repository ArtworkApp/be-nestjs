import { ConfigService } from '@nestjs/config';
import { MailpitEmailSender } from './mailpit-email.sender';

describe('MailpitEmailSender', () => {
  const message = {
    to: 'person@example.com',
    subject: 'Welcome',
    text: 'Welcome to ArtworkApp.',
    html: '<p>Welcome to ArtworkApp.</p>',
  };

  it('sends the message through SMTP using the configured sender', async () => {
    const transport = { sendMail: jest.fn().mockResolvedValue({}) };
    const config = new ConfigService({ FROM_EMAIL: 'dev@example.com' });
    const sender = new MailpitEmailSender(transport, config);

    await sender.send(message);

    expect(transport.sendMail).toHaveBeenCalledWith({
      from: 'dev@example.com',
      ...message,
    });
  });

  it('propagates delivery failures for the caller to handle', async () => {
    const error = new Error('SMTP unavailable');
    const transport = { sendMail: jest.fn().mockRejectedValue(error) };
    const config = new ConfigService({ FROM_EMAIL: 'dev@example.com' });

    await expect(
      new MailpitEmailSender(transport, config).send(message),
    ).rejects.toBe(error);
  });

  it('uses the configured sender even if a message contains an extra from field', async () => {
    const transport = { sendMail: jest.fn().mockResolvedValue({}) };
    const sender = new MailpitEmailSender(
      transport,
      new ConfigService({ FROM_EMAIL: 'dev@example.com' }),
    );

    const messageWithExtraField = { ...message, from: 'other@example.com' };
    await sender.send(messageWithExtraField);

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'dev@example.com' }),
    );
  });
});
