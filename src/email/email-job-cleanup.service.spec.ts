import { PrismaService } from '../database/prisma.service';
import { EmailJobCleanupService } from './email-job-cleanup.service';

describe('EmailJobCleanupService', () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const claim = { id: 'job-id', leaseId: 'lease-id' };
  let updateMany: jest.Mock;
  let service: EmailJobCleanupService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    service = new EmailJobCleanupService({
      emailJob: { updateMany },
    } as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('expires jobs that are not actively leased and clears encrypted content', async () => {
    await expect(service.expireJobs()).resolves.toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lte: now },
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: 'EXPIRED',
        encryptedPayload: null,
        payloadKeyId: null,
        leaseId: null,
        leaseExpiresAt: null,
      },
    });
  });

  it('fails a job only when its current lease has reached the attempt limit', async () => {
    await expect(service.failExhausted(claim, 3)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: claim.id,
        leaseId: claim.leaseId,
        status: 'PROCESSING',
        leaseExpiresAt: { gt: now },
        attempts: { gte: 3 },
      },
      data: {
        status: 'FAILED',
        encryptedPayload: null,
        payloadKeyId: null,
        leaseId: null,
        leaseExpiresAt: null,
        lastErrorCode: 'DELIVERY_FAILED',
      },
    });
  });

  it('does not report success for a stale lease', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.failExhausted(claim, 3)).resolves.toBe(false);
  });

  it.each([0, -1, 1.5, Infinity])(
    'rejects an invalid attempt limit',
    async (limit) => {
      await expect(service.failExhausted(claim, limit)).rejects.toThrow(
        'Invalid email attempt limit.',
      );
      expect(updateMany).not.toHaveBeenCalled();
    },
  );
});
