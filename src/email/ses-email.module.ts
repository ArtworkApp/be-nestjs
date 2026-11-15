import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SES_EMAIL_CLIENT, SesEmailSender } from './ses-email.sender';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SES_EMAIL_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SESv2Client({ region: config.getOrThrow<string>('AWS_REGION') }),
    },
    SesEmailSender,
  ],
  exports: [SesEmailSender],
})
export class SesEmailModule {}
