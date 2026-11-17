import { PrismaService } from '../database/prisma.service';
import { ClaimedEmailJob } from './email-job-claim.service';

export class EmailJobOutcomeService {
  constructor(private readonly prisma: PrismaService) {}

  async markSent(claim: ClaimedEmailJob): Promise<boolean> {
    const result = await this.prisma.emailJob.updateMany({
      where: this.currentLease(claim, new Date()),
      data: {
        status: 'SENT',
        encryptedPayload: null,
        payloadKeyId: null,
        leaseId: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
      },
    });
    return result.count === 1;
  }

  async scheduleRetry(claim: ClaimedEmailJob, retryAt: Date): Promise<boolean> {
    const now = new Date();
    if (!Number.isFinite(retryAt.getTime()) || retryAt <= now) {
      throw new Error('Invalid email retry time.');
    }
    const result = await this.prisma.emailJob.updateMany({
      where: { ...this.currentLease(claim, now), expiresAt: { gt: retryAt } },
      data: {
        status: 'PENDING',
        availableAt: retryAt,
        leaseId: null,
        leaseExpiresAt: null,
        lastErrorCode: 'DELIVERY_FAILED',
      },
    });
    return result.count === 1;
  }

  private currentLease(claim: ClaimedEmailJob, now: Date) {
    return {
      id: claim.id,
      leaseId: claim.leaseId,
      status: 'PROCESSING' as const,
      leaseExpiresAt: { gt: now },
    };
  }
}
