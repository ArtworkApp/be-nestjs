import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { CredentialsService } from './credentials.service';
import { SessionService } from './session.service';

@Module({
  imports: [ConfigModule, DatabaseModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [CredentialsService, SessionService],
})
export class AuthModule {}
