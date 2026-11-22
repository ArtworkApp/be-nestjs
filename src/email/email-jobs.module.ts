import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailJobService } from './email-job.service';
import { EmailJobReaderService } from './email-job-reader.service';
import { EmailPayloadProtector } from './email-payload-protector';

function readEncryptionKey(config: ConfigService): Buffer {
  const value = config.get<string>('EMAIL_PAYLOAD_KEY');
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error('EMAIL_PAYLOAD_KEY must be a base64-encoded 32-byte key.');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw new Error('EMAIL_PAYLOAD_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

function readKeyId(config: ConfigService): string {
  const value = config.get<string>('EMAIL_PAYLOAD_KEY_ID')?.trim();
  if (!value) throw new Error('EMAIL_PAYLOAD_KEY_ID is required.');
  return value;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EmailPayloadProtector,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new EmailPayloadProtector(readEncryptionKey(config)),
    },
    {
      provide: EmailJobService,
      inject: [EmailPayloadProtector, ConfigService],
      useFactory: (protector: EmailPayloadProtector, config: ConfigService) =>
        new EmailJobService(protector, readKeyId(config)),
    },
    {
      provide: EmailJobReaderService,
      inject: [EmailPayloadProtector, ConfigService],
      useFactory: (protector: EmailPayloadProtector, config: ConfigService) =>
        new EmailJobReaderService(protector, readKeyId(config)),
    },
  ],
  exports: [EmailJobService, EmailJobReaderService, EmailPayloadProtector],
})
export class EmailJobsModule {}
