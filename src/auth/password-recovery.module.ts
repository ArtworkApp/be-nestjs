import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { EmailJobsModule } from '../email/email-jobs.module';
import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';
import { readPasswordResetConfig } from './password-reset-config';
import { PasswordResetConfirmService } from './password-reset-confirm.service';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetRequestFacade } from './password-reset-request-facade';
import { PasswordResetRequestService } from './password-reset-request.service';
import { PasswordResetTokenService } from './password-reset-token.service';

@Module({
  imports: [ConfigModule, DatabaseModule, EmailJobsModule],
  controllers: [PasswordResetController],
  providers: [
    RecoveryRateLimitGuard,
    {
      provide: PasswordResetTokenService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const settings = readPasswordResetConfig(config);
        return new PasswordResetTokenService(
          settings.origin,
          settings.lifetimeSeconds,
        );
      },
    },
    {
      provide: PasswordResetRequestService,
      inject: [PrismaService, EmailJobService, PasswordResetTokenService],
      useFactory: (
        prisma: PrismaService,
        jobs: EmailJobService,
        tokens: PasswordResetTokenService,
      ) => new PasswordResetRequestService(prisma, jobs, tokens),
    },
    {
      provide: PasswordResetRequestFacade,
      inject: [PasswordResetRequestService],
      useFactory: (requests: PasswordResetRequestService) =>
        new PasswordResetRequestFacade(requests),
    },
    {
      provide: PasswordResetConfirmService,
      inject: [PrismaService, EmailJobService],
      useFactory: (prisma: PrismaService, jobs: EmailJobService) =>
        new PasswordResetConfirmService(prisma, jobs),
    },
  ],
})
export class PasswordRecoveryModule {}
