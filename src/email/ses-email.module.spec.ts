import { SESv2Client } from '@aws-sdk/client-sesv2';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SesEmailModule } from './ses-email.module';
import { SesEmailSender } from './ses-email.sender';

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  SendEmailCommand: jest.fn(),
}));

describe('SesEmailModule', () => {
  it('configures the AWS region and leaves credentials to the SDK chain', async () => {
    const values: Record<string, string> = { AWS_REGION: 'ap-northeast-2' };
    const module = await Test.createTestingModule({ imports: [SesEmailModule] })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: (key: string) => values[key] })
      .compile();

    expect(module.get(SesEmailSender)).toBeInstanceOf(SesEmailSender);
    expect(SESv2Client).toHaveBeenCalledWith({ region: 'ap-northeast-2' });
  });
});
