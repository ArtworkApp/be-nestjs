import { PrismaService } from '../database/prisma.service';
import { ClaimedEmailJob } from './email-job-claim.service';

const clearSensitiveContent = {
  encryptedPayload: null,
  payloadKeyId: null,
  leaseId: null,
  leaseExpiresAt: null,
};

export class EmailJobCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  async expireJobs(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.emailJob.updateMany({
      where: {
        expiresAt: { lte: now },
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
        ],
      },
      data: { status: 'EXPIRED', ...clearSensitiveContent },
    });
    return result.count;
  }

  async failExhausted(claim: ClaimedEmailJob, limit: number): Promise<boolean> {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error('Invalid email attempt limit.');
    }
    const result = await this.prisma.emailJob.updateMany({
      where: {
        id: claim.id,
        leaseId: claim.leaseId,
        status: 'PROCESSING',
        leaseExpiresAt: { gt: new Date() },
        attempts: { gte: limit },
      },
      data: {
        status: 'FAILED',
        ...clearSensitiveContent,
        lastErrorCode: 'DELIVERY_FAILED',
      },
    });
    return result.count === 1;
  }
}
