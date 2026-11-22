import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailMessage, EmailSender } from './email-sender';

@Injectable()
class EmailConsumer {
  constructor(readonly sender: EmailSender) {}
}

describe('email sender boundary', () => {
  it('allows a fake sender to be injected and receive a message', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [EmailConsumer, { provide: EmailSender, useValue: { send } }],
    }).compile();
    const message: EmailMessage = {
      to: 'person@example.com',
      subject: 'Welcome',
      text: 'Welcome to ArtworkApp.',
      html: '<p>Welcome to ArtworkApp.</p>',
    };

    await module.get(EmailConsumer).sender.send(message);

    expect(send).toHaveBeenCalledWith(message);
  });
});
