import { PrismaService } from '../database/prisma.service';

export class RecoveryRateLimitMaintenance {
  constructor(private readonly prisma: PrismaService) {}

  async deleteExpired(): Promise<void> {
    await this.prisma.recoveryRateLimit.deleteMany({
      where: { resetAt: { lte: new Date() } },
    });
  }
}
