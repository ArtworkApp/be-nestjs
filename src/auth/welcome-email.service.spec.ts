import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailJobService } from '../email/email-job.service';
import { WelcomeEmailService } from './welcome-email.service';

describe('WelcomeEmailService', () => {
  const user = {
    id: 'user-id',
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
  };
  it('queues a welcome message with a stable idempotency key', async () => {
    const tx = {};
    const prisma = {
      $transaction: jest.fn((work) => work(tx)),
    } as unknown as PrismaService;
    const jobs = {
      enqueue: jest.fn().mockResolvedValue({}),
    } as unknown as EmailJobService;
    await new WelcomeEmailService(prisma, jobs).queue(user);
    expect(jobs.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: user.id,
        kind: 'WELCOME',
        idempotencyKey: 'welcome:user-id',
        message: expect.objectContaining({ to: user.email }),
      }),
    );
  });

  it('does not fail registration when queueing fails', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const prisma = {
      $transaction: jest
        .fn()
        .mockRejectedValue(new Error('sensitive@example.com')),
    } as unknown as PrismaService;
    const service = new WelcomeEmailService(prisma, {} as EmailJobService);
    await expect(service.queue(user)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('Welcome email could not be queued.');
    log.mockRestore();
  });
});
