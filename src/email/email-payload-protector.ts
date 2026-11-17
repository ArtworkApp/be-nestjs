import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

export class EmailPayloadProtector {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== KEY_LENGTH) {
      throw new Error('Email payload encryption requires a 32-byte key.');
    }
    this.key = Buffer.from(key);
  }

  encrypt(payload: string): Buffer {
    const nonce = randomBytes(NONCE_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(payload, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
  }

  decrypt(payload: Buffer): string {
    if (payload.length < NONCE_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted email payload.');
    }
    const nonce = payload.subarray(0, NONCE_LENGTH);
    const tag = payload.subarray(NONCE_LENGTH, NONCE_LENGTH + TAG_LENGTH);
    const ciphertext = payload.subarray(NONCE_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
