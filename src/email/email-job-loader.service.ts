import { EmailJobKind } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ClaimedEmailJob } from './email-job-claim.service';

export class EmailJobLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  async load(claim: ClaimedEmailJob) {
    const now = new Date();
    const job = await this.prisma.emailJob.findFirst({
      where: {
        id: claim.id,
        leaseId: claim.leaseId,
        status: 'PROCESSING',
        leaseExpiresAt: { gt: now },
        expiresAt: { gt: now },
        OR: [
          { kind: { not: EmailJobKind.PASSWORD_RESET } },
          {
            kind: EmailJobKind.PASSWORD_RESET,
            resetToken: {
              is: { usedAt: null, invalidatedAt: null, expiresAt: { gt: now } },
            },
          },
        ],
      },
      include: { resetToken: { select: { userId: true } } },
    });
    if (
      job?.kind === EmailJobKind.PASSWORD_RESET &&
      job.resetToken?.userId !== job.userId
    ) {
      return null;
    }
    return job;
  }
}
