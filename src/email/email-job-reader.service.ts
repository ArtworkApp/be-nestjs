import { EmailMessage } from './email-sender';
import { EmailPayloadProtector } from './email-payload-protector';

export interface StoredEmailPayload {
  payloadKeyId: string | null;
  encryptedPayload: Uint8Array | null;
}

function isEmailMessage(value: unknown): value is EmailMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return ['to', 'subject', 'text', 'html'].every(
    (field) => typeof message[field] === 'string',
  );
}

export class EmailJobReaderService {
  constructor(
    private readonly protector: EmailPayloadProtector,
    private readonly keyId: string,
  ) {}

  read(job: StoredEmailPayload): EmailMessage {
    try {
      if (job.payloadKeyId !== this.keyId || !job.encryptedPayload) {
        throw new Error();
      }
      const plaintext = this.protector.decrypt(
        Buffer.from(job.encryptedPayload),
      );
      const message: unknown = JSON.parse(plaintext);
      if (!isEmailMessage(message)) throw new Error();
      return message;
    } catch {
      throw new Error('Invalid email job payload.');
    }
  }
}
