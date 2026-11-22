import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailSender } from './email-sender';
import { MailpitEmailModule } from './mailpit-email.module';
import { MailpitEmailSender } from './mailpit-email.sender';
import { SesEmailModule } from './ses-email.module';
import { SesEmailSender } from './ses-email.sender';

@Module({
  imports: [ConfigModule, MailpitEmailModule, SesEmailModule],
  providers: [
    {
      provide: EmailSender,
      inject: [ConfigService, MailpitEmailSender, SesEmailSender],
      useFactory: (
        config: ConfigService,
        mailpit: MailpitEmailSender,
        ses: SesEmailSender,
      ): EmailSender => {
        const transport = config.getOrThrow<string>('EMAIL_TRANSPORT');
        if (transport === 'mailpit') return mailpit;
        if (transport === 'ses') return ses;
        throw new Error('Unsupported email transport.');
      },
    },
  ],
  exports: [EmailSender],
})
export class EmailModule {}
