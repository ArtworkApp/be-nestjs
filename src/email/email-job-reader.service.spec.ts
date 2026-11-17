import { randomBytes } from 'crypto';
import { EmailJobReaderService } from './email-job-reader.service';
import { EmailPayloadProtector } from './email-payload-protector';

describe('EmailJobReaderService', () => {
  const protector = new EmailPayloadProtector(randomBytes(32));
  const reader = new EmailJobReaderService(protector, 'key-1');
  const message = {
    to: 'person@example.com',
    subject: 'Reset',
    text: 'Reset link',
    html: '<p>Reset</p>',
  };

  it('decrypts a valid job message', () => {
    const payload = protector.encrypt(JSON.stringify(message));
    expect(
      reader.read({ payloadKeyId: 'key-1', encryptedPayload: payload }),
    ).toEqual(message);
  });

  it('rejects missing or unknown key identifiers and missing payloads', () => {
    const encryptedPayload = protector.encrypt(JSON.stringify(message));
    expect(() =>
      reader.read({ payloadKeyId: 'other-key', encryptedPayload }),
    ).toThrow();
    expect(() =>
      reader.read({ payloadKeyId: null, encryptedPayload }),
    ).toThrow();
    expect(() =>
      reader.read({ payloadKeyId: 'key-1', encryptedPayload: null }),
    ).toThrow();
  });

  it.each([
    'not json',
    JSON.stringify({ ...message, to: 5 }),
    JSON.stringify({ ...message, html: null }),
  ])('rejects invalid messages without exposing their contents', (payload) => {
    const encryptedPayload = protector.encrypt(payload);
    expect(() =>
      reader.read({ payloadKeyId: 'key-1', encryptedPayload }),
    ).toThrow('Invalid email job payload.');
  });

  it('rejects altered ciphertext with a safe error', () => {
    const encryptedPayload = protector.encrypt(JSON.stringify(message));
    encryptedPayload[encryptedPayload.length - 1] ^= 1;
    expect(() =>
      reader.read({ payloadKeyId: 'key-1', encryptedPayload }),
    ).toThrow('Invalid email job payload.');
  });
});
