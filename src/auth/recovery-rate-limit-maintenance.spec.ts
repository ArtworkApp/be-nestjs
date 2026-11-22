import { PrismaService } from '../database/prisma.service';
import { RecoveryRateLimitMaintenance } from './recovery-rate-limit-maintenance';

it('deletes expired shared rate limit windows', async () => {
  const remove = jest.fn().mockResolvedValue({ count: 1 });
  const maintenance = new RecoveryRateLimitMaintenance({
    recoveryRateLimit: { deleteMany: remove },
  } as unknown as PrismaService);
  await maintenance.deleteExpired();
  expect(remove).toHaveBeenCalledWith({
    where: { resetAt: { lte: expect.any(Date) } },
  });
});
