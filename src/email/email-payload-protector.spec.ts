import { randomBytes } from 'crypto';
import { EmailPayloadProtector } from './email-payload-protector';

describe('EmailPayloadProtector', () => {
  const key = randomBytes(32);
  const payload = 'https://example.test/reset?token=secret';

  it('encrypts and restores a payload without storing its plaintext', () => {
    const protector = new EmailPayloadProtector(key);
    const encrypted = protector.encrypt(payload);

    expect(encrypted.includes(Buffer.from(payload))).toBe(false);
    expect(protector.decrypt(encrypted)).toBe(payload);
  });

  it('uses a fresh nonce for each encryption', () => {
    const protector = new EmailPayloadProtector(key);
    expect(protector.encrypt(payload)).not.toEqual(protector.encrypt(payload));
  });

  it('rejects tampered ciphertext and ciphertext from another key', () => {
    const protector = new EmailPayloadProtector(key);
    const encrypted = protector.encrypt(payload);
    const altered = Buffer.from(encrypted);
    altered[altered.length - 1] ^= 1;

    expect(() => protector.decrypt(altered)).toThrow();
    expect(() =>
      new EmailPayloadProtector(randomBytes(32)).decrypt(encrypted),
    ).toThrow();
  });

  it('rejects invalid keys and truncated payloads', () => {
    expect(() => new EmailPayloadProtector(Buffer.alloc(31))).toThrow();
    expect(() =>
      new EmailPayloadProtector(key).decrypt(Buffer.alloc(27)),
    ).toThrow();
  });
});
