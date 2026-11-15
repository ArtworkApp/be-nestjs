import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { EmailSender } from './email-sender';
import { MAILPIT_TRANSPORT, MailpitEmailSender } from './mailpit-email.sender';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAILPIT_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createTransport({
          host: config.getOrThrow<string>('MAILPIT_SMTP_HOST'),
          port: config.getOrThrow<number>('MAILPIT_SMTP_PORT'),
          secure: false,
        }),
    },
    MailpitEmailSender,
    { provide: EmailSender, useExisting: MailpitEmailSender },
  ],
  exports: [EmailSender],
})
export class MailpitEmailModule {}
