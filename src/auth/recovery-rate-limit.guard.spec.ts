import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { AuthRateLimit } from './auth-rate-limit.guard';
import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';

class Routes {
  @AuthRateLimit(2, 60000)
  request(): void {}
}

describe('RecoveryRateLimitGuard', () => {
  const context = {
    getHandler: () => Routes.prototype.request,
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ ip: '192.0.2.1' }) }),
  } as unknown as ExecutionContext;

  it('allows requests when PostgreSQL reserves a slot', async () => {
    const query = jest.fn().mockResolvedValue([{ count: 1 }]);
    const guard = new RecoveryRateLimitGuard(new Reflector(), {
      $queryRaw: query,
    } as unknown as PrismaService);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(query.mock.calls)).not.toContain('192.0.2.1');
  });

  it('rejects requests when the shared limit is reached', async () => {
    const guard = new RecoveryRateLimitGuard(new Reflector(), {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
      response: { error: { code: 'RATE_LIMITED' } },
    });
  });

  it('fails closed if the database is unavailable', async () => {
    const guard = new RecoveryRateLimitGuard(new Reflector(), {
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as PrismaService);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'database unavailable',
    );
  });
});
