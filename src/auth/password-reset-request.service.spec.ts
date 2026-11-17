import { EmailJobKind, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordResetRequestService } from './password-reset-request.service';

describe('PasswordResetRequestService', () => {
  const reset = {
    token: 'raw-secret',
    tokenHash: 'token-hash',
    expiresAt: new Date('2030-01-01T00:15:00Z'),
    resetUrl: 'https://app.example.com/reset-password#token=raw-secret',
  };

  function setup(user: { id: string; email: string } | null) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue(user ? [user] : []),
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'reset-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((work) => work(tx)),
    } as unknown as PrismaService;
    const jobs = {
      enqueue: jest.fn().mockResolvedValue({ id: 'job-id' }),
    } as unknown as EmailJobService;
    const tokens = {
      create: jest.fn().mockReturnValue(reset),
    } as unknown as PasswordResetTokenService;
    return {
      tx,
      jobs,
      service: new PasswordResetRequestService(prisma, jobs, tokens),
    };
  }

  it('invalidates old tokens and creates the new token and email job in one transaction', async () => {
    const { tx, jobs, service } = setup({
      id: 'user-id',
      email: 'person@example.com',
    });
    await expect(
      service.request(' Person@Example.com '),
    ).resolves.toBeUndefined();
    expect(tx.$queryRaw).toHaveBeenCalledWith(
      expect.anything(),
      'person@example.com',
    );
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-id',
          usedAt: null,
          invalidatedAt: null,
        }),
      }),
    );
    expect(tx.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-id',
          tokenHash: reset.tokenHash,
          expiresAt: reset.expiresAt,
        }),
      }),
    );
    expect(jobs.enqueue).toHaveBeenCalledWith(
      tx as unknown as Prisma.TransactionClient,
      expect.objectContaining({
        userId: 'user-id',
        resetTokenId: 'reset-id',
        kind: EmailJobKind.PASSWORD_RESET,
        expiresAt: reset.expiresAt,
        message: expect.objectContaining({
          to: 'person@example.com',
          text: expect.stringContaining(reset.resetUrl),
        }),
      }),
    );
  });

  it('returns the same result for an unknown email without creating records', async () => {
    const { tx, jobs, service } = setup(null);
    await expect(
      service.request('missing@example.com'),
    ).resolves.toBeUndefined();
    expect(tx.passwordResetToken.create).not.toHaveBeenCalled();
    expect(jobs.enqueue).not.toHaveBeenCalled();
  });

  it('propagates job creation errors so the transaction rolls back', async () => {
    const { jobs, service } = setup({
      id: 'user-id',
      email: 'person@example.com',
    });
    const error = new Error('database unavailable');
    jest.mocked(jobs.enqueue).mockRejectedValue(error);
    await expect(service.request('person@example.com')).rejects.toBe(error);
  });
});
