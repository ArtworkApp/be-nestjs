import { PrismaService } from '../database/prisma.service';
import { EmailJobOutcomeService } from './email-job-outcome.service';

describe('EmailJobOutcomeService', () => {
  const claim = { id: 'job-id', leaseId: 'lease-id' };
  const now = new Date('2030-01-01T00:00:00.000Z');
  let updateMany: jest.Mock;
  let service: EmailJobOutcomeService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    service = new EmailJobOutcomeService({
      emailJob: { updateMany },
    } as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('marks a job sent only for an unexpired matching lease and clears the payload', async () => {
    await expect(service.markSent(claim)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: claim.id,
        leaseId: claim.leaseId,
        status: 'PROCESSING',
        leaseExpiresAt: { gt: now },
      },
      data: {
        status: 'SENT',
        encryptedPayload: null,
        payloadKeyId: null,
        leaseId: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
      },
    });
  });

  it('schedules a retry only when the lease is current and the job will not have expired', async () => {
    const retryAt = new Date(now.getTime() + 60000);
    await expect(service.scheduleRetry(claim, retryAt)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: claim.id,
        leaseId: claim.leaseId,
        status: 'PROCESSING',
        leaseExpiresAt: { gt: now },
        expiresAt: { gt: retryAt },
      },
      data: {
        status: 'PENDING',
        availableAt: retryAt,
        leaseId: null,
        leaseExpiresAt: null,
        lastErrorCode: 'DELIVERY_FAILED',
      },
    });
  });

  it('returns false when a stale lease cannot update the job', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markSent(claim)).resolves.toBe(false);
    await expect(
      service.scheduleRetry(claim, new Date(now.getTime() + 1000)),
    ).resolves.toBe(false);
  });

  it('rejects a retry time that is invalid or not in the future', async () => {
    await expect(service.scheduleRetry(claim, now)).rejects.toThrow(
      'Invalid email retry time.',
    );
    await expect(service.scheduleRetry(claim, new Date(NaN))).rejects.toThrow(
      'Invalid email retry time.',
    );
    expect(updateMany).not.toHaveBeenCalled();
  });
});
