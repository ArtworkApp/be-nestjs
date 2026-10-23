import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { CredentialsService } from './credentials.service';
import { SessionService } from './session.service';

describe('AuthModule', () => {
  it('wires the controller to credential and session providers', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module.get(AuthController)).toBeInstanceOf(AuthController);
    expect(module.get(CredentialsService)).toBeInstanceOf(CredentialsService);
    expect(module.get(SessionService)).toBeInstanceOf(SessionService);
    await module.close();
  });
});
