import { EmailJobKind, Prisma } from '@prisma/client';
import { EmailMessage } from './email-sender';
import { EmailPayloadProtector } from './email-payload-protector';

export interface EnqueueEmailOptions {
  userId: string;
  resetTokenId?: string;
  kind: EmailJobKind;
  idempotencyKey: string;
  expiresAt: Date;
  message: EmailMessage;
}

export class EmailJobService {
  constructor(
    private readonly protector: EmailPayloadProtector,
    private readonly keyId: string,
  ) {}

  enqueue(transaction: Prisma.TransactionClient, options: EnqueueEmailOptions) {
    const encryptedPayload = this.protector.encrypt(
      JSON.stringify(options.message),
    );
    return transaction.emailJob.create({
      data: {
        userId: options.userId,
        resetTokenId: options.resetTokenId,
        kind: options.kind,
        idempotencyKey: options.idempotencyKey,
        expiresAt: options.expiresAt,
        encryptedPayload: Uint8Array.from(encryptedPayload),
        payloadKeyId: this.keyId,
      },
    });
  }
}
