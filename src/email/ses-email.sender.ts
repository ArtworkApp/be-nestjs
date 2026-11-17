import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailSender } from './email-sender';

export const SES_EMAIL_CLIENT = Symbol('SES_EMAIL_CLIENT');

export interface SesEmailClient {
  send(command: SendEmailCommand): Promise<unknown>;
}

@Injectable()
export class SesEmailSender extends EmailSender {
  constructor(
    @Inject(SES_EMAIL_CLIENT) private readonly client: SesEmailClient,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const command = this.createSendCommand(message);
    await this.client.send(command);
  }

  private createSendCommand(message: EmailMessage): SendEmailCommand {
    return new SendEmailCommand({
      FromEmailAddress: this.config.getOrThrow<string>('FROM_EMAIL'),
      Destination: { ToAddresses: [message.to] },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: message.text, Charset: 'UTF-8' },
            Html: { Data: message.html, Charset: 'UTF-8' },
          },
        },
      },
    });
  }
}
