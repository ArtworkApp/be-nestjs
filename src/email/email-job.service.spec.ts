import { randomBytes } from 'crypto';
import { EmailJobKind, Prisma } from '@prisma/client';
import { EmailJobService } from './email-job.service';
import { EmailPayloadProtector } from './email-payload-protector';

describe('EmailJobService', () => {
  const message = {
    to: 'person@example.com',
    subject: 'Reset your password',
    text: 'https://example.test/reset?token=secret',
    html: '<p>Reset password</p>',
  };
  const options = {
    userId: 'user-id',
    resetTokenId: 'reset-id',
    kind: EmailJobKind.PASSWORD_RESET,
    idempotencyKey: 'reset-reset-id',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    message,
  };

  it('stores an encrypted message through the supplied transaction', async () => {
    const protector = new EmailPayloadProtector(randomBytes(32));
    const create = jest.fn().mockResolvedValue({ id: 'job-id' });
    const transaction = {
      emailJob: { create },
    } as unknown as Prisma.TransactionClient;
    const service = new EmailJobService(protector, 'key-1');

    await expect(service.enqueue(transaction, options)).resolves.toEqual({
      id: 'job-id',
    });
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: options.userId,
      resetTokenId: options.resetTokenId,
      kind: options.kind,
      idempotencyKey: options.idempotencyKey,
      expiresAt: options.expiresAt,
      payloadKeyId: 'key-1',
    });
    const payload = Buffer.from(data.encryptedPayload);
    expect(payload.includes(Buffer.from('secret'))).toBe(false);
    expect(JSON.parse(protector.decrypt(payload))).toEqual(message);
  });

  it('propagates database errors so the caller can roll back', async () => {
    const failure = new Error('database unavailable');
    const transaction = {
      emailJob: { create: jest.fn().mockRejectedValue(failure) },
    } as unknown as Prisma.TransactionClient;
    const service = new EmailJobService(
      new EmailPayloadProtector(randomBytes(32)),
      'key-1',
    );

    await expect(service.enqueue(transaction, options)).rejects.toBe(failure);
  });
});
