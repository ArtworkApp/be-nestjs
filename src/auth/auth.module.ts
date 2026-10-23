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

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    CredentialsService,
    SessionService,
    JwtStrategy,
    JwtAuthGuard,
    AuthRateLimitGuard,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
