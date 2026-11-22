import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { CredentialsService } from './credentials.service';
import { SessionService } from './session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { PasswordRecoveryModule } from './password-recovery.module';
import { EmailJobsModule } from '../email/email-jobs.module';
import { EmailJobService } from '../email/email-job.service';
import { PrismaService } from '../database/prisma.service';
import { WelcomeEmailService } from './welcome-email.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.register({}),
    PassportModule,
    EmailJobsModule,
    PasswordRecoveryModule,
  ],
  controllers: [AuthController],
  providers: [
    CredentialsService,
    SessionService,
    JwtStrategy,
    JwtAuthGuard,
    AuthRateLimitGuard,
    {
      provide: WelcomeEmailService,
      inject: [PrismaService, EmailJobService],
      useFactory: (prisma: PrismaService, jobs: EmailJobService) =>
        new WelcomeEmailService(prisma, jobs),
    },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
