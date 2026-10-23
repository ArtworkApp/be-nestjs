import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiException } from '../common/errors/api.exception';

export type AuthTransport = 'web' | 'mobile';

export function allowedWebOrigins(config: ConfigService): string[] {
  const origins = config
    .getOrThrow<string>('AUTH_WEB_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error('AUTH_WEB_ORIGINS must contain at least one origin.');
  }
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) {
      throw new Error(`Invalid AUTH_WEB_ORIGINS entry: ${origin}`);
    }
    if (
      config.get<string>('NODE_ENV') === 'production' &&
      parsed.protocol !== 'https:'
    ) {
      throw new Error('Production AUTH_WEB_ORIGINS must use HTTPS.');
    }
  }
  return origins;
}

export function assertAuthWriteRequest(
  request: Request,
  transport: AuthTransport,
  config: ConfigService,
): void {
  if (config.get<string>('NODE_ENV') !== 'development' && !request.secure) {
    throw new ApiException({
      status: HttpStatus.FORBIDDEN,
      code: 'HTTPS_REQUIRED',
      message: 'HTTPS is required.',
    });
  }
  if (
    !/^application\/json(?:\s*;.*)?$/i.test(
      request.headers['content-type'] ?? '',
    )
  ) {
    throw new ApiException({
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'Send a JSON request.',
    });
  }

  if (transport === 'web') {
    const origin = request.headers.origin;
    if (!origin || !allowedWebOrigins(config).includes(origin)) {
      throw new ApiException({
        status: HttpStatus.FORBIDDEN,
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed.',
      });
    }
    return;
  }

  if (request.headers.origin || request.headers.cookie) {
    throw new ApiException({
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'Mobile requests must not include browser Origin or cookies.',
    });
  }
}
