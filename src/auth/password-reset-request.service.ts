import { EmailJobKind, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { renderPasswordResetEmail } from '../email/email-templates';
import { normalizeEmail } from './credentials.service';
import {
  PasswordResetToken,
  PasswordResetTokenService,
} from './password-reset-token.service';

interface ResetUser {
  id: string;
  email: string;
}

export class PasswordResetRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: EmailJobService,
    private readonly tokens: PasswordResetTokenService,
  ) {}

  async request(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const now = new Date();
    const token = this.tokens.create(now);
    await this.prisma.$transaction(async (transaction) => {
      const user = await this.lockUser(transaction, normalizedEmail);
      if (user) await this.createResetJob(transaction, { user, token, now });
    });
  }

  private async lockUser(
    transaction: Prisma.TransactionClient,
    email: string,
  ): Promise<ResetUser | undefined> {
    const users = await transaction.$queryRaw<ResetUser[]>`
      SELECT id, email FROM users WHERE email = ${email} FOR UPDATE
    `;
    return users[0];
  }

  private async createResetJob(
    transaction: Prisma.TransactionClient,
    options: { user: ResetUser; token: PasswordResetToken; now: Date },
  ): Promise<void> {
    const { user, token, now } = options;
    await transaction.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    const reset = await transaction.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
      select: { id: true },
    });
    await this.jobs.enqueue(transaction, {
      userId: user.id,
      resetTokenId: reset.id,
      kind: EmailJobKind.PASSWORD_RESET,
      idempotencyKey: `password-reset:${reset.id}`,
      expiresAt: token.expiresAt,
      message: renderPasswordResetEmail({
        to: user.email,
        resetUrl: token.resetUrl,
      }),
    });
  }
}
