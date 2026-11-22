import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { PasswordRecoveryModule } from './password-recovery.module';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetRequestFacade } from './password-reset-request-facade';
import { PasswordResetConfirmService } from './password-reset-confirm.service';

describe('PasswordRecoveryModule', () => {
  it('provides configured recovery handlers', async () => {
    const values: Record<string, string> = {
      NODE_ENV: 'development',
      EMAIL_PAYLOAD_KEY: randomBytes(32).toString('base64'),
      EMAIL_PAYLOAD_KEY_ID: 'test-key',
    };
    const module = await Test.createTestingModule({
      imports: [PasswordRecoveryModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => values[key] })
      .compile();
    expect(module.get(PasswordResetController)).toBeInstanceOf(
      PasswordResetController,
    );
    expect(module.get(PasswordResetRequestFacade)).toBeInstanceOf(
      PasswordResetRequestFacade,
    );
    expect(module.get(PasswordResetConfirmService)).toBeInstanceOf(
      PasswordResetConfirmService,
    );
    await module.close();
  });
});
