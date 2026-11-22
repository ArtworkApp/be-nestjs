import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { PasswordResetConfirmService } from './password-reset-confirm.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('new-password-hash'),
}));

describe('PasswordResetConfirmService', () => {
  const token = 'a'.repeat(43);
  const hash = createHash('sha256').update(token).digest('hex');

  function setup() {
    const tx = {
      passwordResetToken: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'reset-id', userId: 'user-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id: 'user-id', email: 'person@example.com' }]),
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: jest.fn((work) => work(tx)),
    } as unknown as PrismaService;
    const jobs = {
      enqueue: jest.fn().mockResolvedValue({}),
    } as unknown as EmailJobService;
    return { tx, jobs, service: new PasswordResetConfirmService(prisma, jobs) };
  }

  it('atomically consumes the token, changes the password, revokes sessions, and queues a notice', async () => {
    const { tx, jobs, service } = setup();
    await expect(
      service.confirm(token, 'new-long-password'),
    ).resolves.toBeUndefined();
    expect(bcrypt.hash).toHaveBeenCalledWith('new-long-password', 12);
    expect(tx.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hash },
      select: { id: true, userId: true },
    });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reset-id',
          usedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: expect.any(Date) },
        }),
        data: { usedAt: expect.any(Date) },
      }),
    );
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        passwordHash: 'new-password-hash',
        sessionVersion: { increment: 1 },
      },
    });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(jobs.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ kind: 'PASSWORD_CHANGED', userId: 'user-id' }),
    );
  });

  it('rejects missing and already consumed tokens with the same error', async () => {
    const { tx, service } = setup();
    tx.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.confirm(token, 'new-long-password'),
    ).rejects.toMatchObject({
      status: 400,
      response: { error: { code: 'INVALID_RESET_TOKEN' } },
    });
    tx.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.confirm(token, 'new-long-password'),
    ).rejects.toMatchObject({
      status: 400,
      response: { error: { code: 'INVALID_RESET_TOKEN' } },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
