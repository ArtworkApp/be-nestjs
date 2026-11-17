import { PrismaService } from '../database/prisma.service';
import { EmailJobClaimService } from './email-job-claim.service';

describe('EmailJobClaimService', () => {
  it('returns the jobs claimed by the database', async () => {
    const jobs = [{ id: 'job-1', leaseId: 'lease-1' }];
    const query = jest.fn().mockResolvedValue(jobs);
    const service = new EmailJobClaimService({
      $queryRaw: query,
    } as unknown as PrismaService);

    await expect(
      service.claim({ batchSize: 5, leaseDurationMs: 30000 }),
    ).resolves.toEqual(jobs);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    { batchSize: 0, leaseDurationMs: 30000 },
    { batchSize: 1.5, leaseDurationMs: 30000 },
    { batchSize: 5, leaseDurationMs: 0 },
    { batchSize: 5, leaseDurationMs: Infinity },
  ])('rejects invalid claim settings without querying', async (options) => {
    const query = jest.fn();
    const service = new EmailJobClaimService({
      $queryRaw: query,
    } as unknown as PrismaService);
    await expect(service.claim(options)).rejects.toThrow(
      'Invalid email job claim settings.',
    );
    expect(query).not.toHaveBeenCalled();
  });
});
