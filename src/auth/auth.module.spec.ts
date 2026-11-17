import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { CredentialsService } from './credentials.service';
import { SessionService } from './session.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthModule', () => {
  it('wires the controller to credential and session providers', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          ({
            EMAIL_PAYLOAD_KEY: Buffer.alloc(32, 1).toString('base64'),
            EMAIL_PAYLOAD_KEY_ID: 'test-key',
            NODE_ENV: 'development',
          }[key]),
        getOrThrow: (key: string) =>
          ({
            JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
            JWT_ISSUER: 'artworkapp-api',
            JWT_AUDIENCE: 'artworkapp-clients',
          }[key]),
      })
      .compile();

    expect(module.get(AuthController)).toBeInstanceOf(AuthController);
    expect(module.get(CredentialsService)).toBeInstanceOf(CredentialsService);
    expect(module.get(SessionService)).toBeInstanceOf(SessionService);
    expect(module.get(JwtStrategy)).toBeInstanceOf(JwtStrategy);
    expect(module.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);
    await module.close();
  });
});
