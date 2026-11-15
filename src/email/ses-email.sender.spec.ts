import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ConfigService } from '@nestjs/config';
import { SesEmailSender } from './ses-email.sender';

describe('SesEmailSender', () => {
  const message = {
    to: 'person@example.com',
    subject: 'Welcome',
    text: 'Welcome to ArtworkApp.',
    html: '<p>Welcome to ArtworkApp.</p>',
  };

  it('sends both message formats with the configured sender', async () => {
    const client = { send: jest.fn().mockResolvedValue({}) };
    const sender = new SesEmailSender(
      client,
      new ConfigService({ FROM_EMAIL: 'accounts@example.com' }),
    );

    await sender.send(message);

    const command = client.send.mock.calls[0][0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: 'accounts@example.com',
      Destination: { ToAddresses: ['person@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Welcome', Charset: 'UTF-8' },
          Body: {
            Text: { Data: 'Welcome to ArtworkApp.', Charset: 'UTF-8' },
            Html: { Data: '<p>Welcome to ArtworkApp.</p>', Charset: 'UTF-8' },
          },
        },
      },
    });
  });

  it('propagates SES failures for retry handling', async () => {
    const error = new Error('SES unavailable');
    const sender = new SesEmailSender(
      { send: jest.fn().mockRejectedValue(error) },
      new ConfigService({ FROM_EMAIL: 'accounts@example.com' }),
    );

    await expect(sender.send(message)).rejects.toBe(error);
  });
});
