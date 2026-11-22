import { createHash } from 'crypto';
import { PasswordResetTokenService } from './password-reset-token.service';

describe('PasswordResetTokenService', () => {
  it('creates a random token, its hash, expiration, and a fragment link', () => {
    const service = new PasswordResetTokenService(
      'https://app.example.com',
      900,
    );
    const now = new Date('2030-01-01T00:00:00Z');
    const result = service.create(now);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.tokenHash).toBe(
      createHash('sha256').update(result.token).digest('hex'),
    );
    expect(result.expiresAt).toEqual(new Date('2030-01-01T00:15:00Z'));
    expect(result.resetUrl).toBe(
      `https://app.example.com/reset-password#token=${result.token}`,
    );
    expect(service.create(now).token).not.toBe(result.token);
  });

  it.each([
    'javascript:alert(1)',
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com?x=y',
    'http://example.com',
  ])('rejects unsafe reset origins', (origin) => {
    expect(() => new PasswordResetTokenService(origin, 900)).toThrow(
      'Invalid password reset origin.',
    );
  });

  it('allows an HTTP localhost origin for local development', () => {
    const service = new PasswordResetTokenService('http://localhost:3000', 900);
    expect(service.create(new Date()).resetUrl).toContain(
      'http://localhost:3000/reset-password#token=',
    );
  });

  it.each([0, -1, 0.5, Infinity])(
    'rejects an invalid token lifetime',
    (ttl) => {
      expect(
        () => new PasswordResetTokenService('https://app.example.com', ttl),
      ).toThrow('Invalid password reset lifetime.');
    },
  );
});
