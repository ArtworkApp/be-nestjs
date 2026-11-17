import { Logger } from '@nestjs/common';
import { EmailJobKind } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { renderWelcomeEmail } from '../email/email-templates';
import type { UserProfile } from './credentials.service';

export class WelcomeEmailService {
  private readonly logger = new Logger(WelcomeEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: EmailJobService,
  ) {}

  async queue(user: UserProfile): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        await this.jobs.enqueue(transaction, {
          userId: user.id,
          kind: EmailJobKind.WELCOME,
          idempotencyKey: `welcome:${user.id}`,
          expiresAt: new Date(Date.now() + 86400000),
          message: renderWelcomeEmail(user.email),
        });
      });
    } catch {
      this.logger.error('Welcome email could not be queued.');
    }
  }
}
