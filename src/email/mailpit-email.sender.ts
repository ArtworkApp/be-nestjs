import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SendMailOptions } from 'nodemailer';
import { EmailMessage, EmailSender } from './email-sender';

export const MAILPIT_TRANSPORT = Symbol('MAILPIT_TRANSPORT');

export interface MailpitTransport {
  sendMail(message: SendMailOptions): Promise<unknown>;
}

@Injectable()
export class MailpitEmailSender extends EmailSender {
  constructor(
    @Inject(MAILPIT_TRANSPORT) private readonly transport: MailpitTransport,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      ...message,
      from: this.config.getOrThrow<string>('FROM_EMAIL'),
    });
  }
}
