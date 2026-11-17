import { PrismaService } from '../database/prisma.service';
import { EmailJobLoaderService } from './email-job-loader.service';

describe('EmailJobLoaderService', () => {
  const claim = { id: 'job-id', leaseId: 'lease-id' };
  const now = new Date('2030-01-01T00:00:00Z');
  let findFirst: jest.Mock;
  let loader: EmailJobLoaderService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    findFirst = jest.fn();
    loader = new EmailJobLoaderService({
      emailJob: { findFirst },
    } as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('loads an eligible job under its current lease', async () => {
    const job = {
      id: claim.id,
      payloadKeyId: 'key-1',
      encryptedPayload: Uint8Array.of(1),
    };
    findFirst.mockResolvedValue(job);
    await expect(loader.load(claim)).resolves.toEqual(job);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: claim.id,
          leaseId: claim.leaseId,
          status: 'PROCESSING',
          leaseExpiresAt: { gt: now },
          expiresAt: { gt: now },
        }),
      }),
    );
  });

  it('returns null if the job, lease, or reset token is no longer eligible', async () => {
    findFirst.mockResolvedValue(null);
    await expect(loader.load(claim)).resolves.toBeNull();
  });

  it('rejects a reset token belonging to a different user', async () => {
    findFirst.mockResolvedValue({
      kind: 'PASSWORD_RESET',
      userId: 'user-1',
      resetToken: { userId: 'user-2' },
    });
    await expect(loader.load(claim)).resolves.toBeNull();
  });
});
