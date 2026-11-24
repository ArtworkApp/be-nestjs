import { createHash, randomBytes } from 'crypto';
import { isIP } from 'net';

export interface PasswordResetToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  resetUrl: string;
}

function isLocalHost(hostname: string): boolean {
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return true;
  if (isIP(hostname) !== 4) return false;
  const [first, second] = hostname.split('.').map(Number);
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function validatePasswordResetOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    const localHttp = url.protocol === 'http:' && isLocalHost(url.hostname);
    if (
      (url.protocol === 'https:' || localHttp) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    )
      return url.origin;
  } catch {
    // Use the same safe configuration error for all malformed origins.
  }
  throw new Error('Invalid password reset origin.');
}

export function validatePasswordResetLifetime(lifetimeSeconds: number): void {
  if (
    !Number.isSafeInteger(lifetimeSeconds) ||
    lifetimeSeconds < 1 ||
    lifetimeSeconds > 86400
  ) {
    throw new Error('Invalid password reset lifetime.');
  }
}

export class PasswordResetTokenService {
  private readonly origin: string;

  constructor(origin: string, private readonly lifetimeSeconds: number) {
    this.origin = validatePasswordResetOrigin(origin);
    validatePasswordResetLifetime(lifetimeSeconds);
  }

  create(now: Date): PasswordResetToken {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(now.getTime() + this.lifetimeSeconds * 1000);
    const resetUrl = `${this.origin}/reset-password#token=${token}`;
    return { token, tokenHash, expiresAt, resetUrl };
  }
}
