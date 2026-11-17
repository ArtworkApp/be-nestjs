import { ConfigService } from '@nestjs/config';
import {
  validatePasswordResetLifetime,
  validatePasswordResetOrigin,
} from './password-reset-token.service';

export interface PasswordResetConfig {
  origin: string;
  lifetimeSeconds: number;
}

export function readPasswordResetConfig(
  config: ConfigService,
): PasswordResetConfig {
  const production = config.get<string>('NODE_ENV') === 'production';
  const configuredOrigin = config.get<string>('PASSWORD_RESET_WEB_ORIGIN');
  if (production && !configuredOrigin)
    throw new Error('PASSWORD_RESET_WEB_ORIGIN is required.');
  const origin = validatePasswordResetOrigin(
    configuredOrigin ?? 'http://localhost:3000',
  );
  if (production && new URL(origin).protocol !== 'https:') {
    throw new Error('PASSWORD_RESET_WEB_ORIGIN must use HTTPS in production.');
  }
  const lifetimeSeconds = Number(
    config.get<string>('PASSWORD_RESET_TTL_SECONDS') ?? 900,
  );
  validatePasswordResetLifetime(lifetimeSeconds);
  return { origin, lifetimeSeconds };
}
