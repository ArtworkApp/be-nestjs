import { HttpStatus } from '@nestjs/common';
import { EmailJobKind, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { ApiException } from '../common/errors/api.exception';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { renderPasswordChangedEmail } from '../email/email-templates';

interface LockedUser {
  id: string;
  email: string;
}

function invalidResetToken(): ApiException {
  return new ApiException({
    status: HttpStatus.BAD_REQUEST,
    code: 'INVALID_RESET_TOKEN',
    message: 'This reset link is invalid or has expired. Request a new link.',
  });
}

export class PasswordResetConfirmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: EmailJobService,
  ) {}

  async confirm(token: string, password: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (transaction) => {
      await this.resetPassword(transaction, { tokenHash, passwordHash });
    });
  }

  private async resetPassword(
    transaction: Prisma.TransactionClient,
    options: { tokenHash: string; passwordHash: string },
  ): Promise<void> {
    const reset = await transaction.passwordResetToken.findUnique({
      where: { tokenHash: options.tokenHash },
      select: { id: true, userId: true },
    });
    if (!reset) throw invalidResetToken();
    const user = await this.lockUser(transaction, reset.userId);
    if (!user) throw invalidResetToken();
    const now = new Date();
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: reset.id,
        usedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw invalidResetToken();
    await transaction.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await transaction.user.update({
      where: { id: user.id },
      data: {
        passwordHash: options.passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await this.jobs.enqueue(transaction, {
      userId: user.id,
      kind: EmailJobKind.PASSWORD_CHANGED,
      idempotencyKey: `password-changed:${reset.id}`,
      expiresAt: new Date(now.getTime() + 86400000),
      message: renderPasswordChangedEmail(user.email),
    });
  }

  private async lockUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<LockedUser | undefined> {
    const users = await transaction.$queryRaw<
      LockedUser[]
    >`SELECT id, email FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    return users[0];
  }
}
