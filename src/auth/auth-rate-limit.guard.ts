import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiException } from '../common/errors/api.exception';

export const AUTH_RATE_LIMIT_KEY = 'authRateLimit';
const MAX_TRACKED_CLIENTS = 10_000;

interface AuthRateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function AuthRateLimit(
  limit: number,
  windowMs: number,
): MethodDecorator {
  return SetMetadata(AUTH_RATE_LIMIT_KEY, { limit, windowMs });
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<AuthRateLimitOptions>(
      AUTH_RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const address = request.ip || request.socket?.remoteAddress || 'unknown';
    const key = `${context.getClass().name}:${
      context.getHandler().name
    }:${address}`;
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || now >= entry.resetAt) {
      if (this.entries.size >= MAX_TRACKED_CLIENTS) {
        this.removeExpiredEntries(now);
      }
      if (!entry && this.entries.size >= MAX_TRACKED_CLIENTS) {
        throw this.rateLimited();
      }
      this.entries.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }
    if (entry.count >= options.limit) {
      throw this.rateLimited();
    }
    entry.count += 1;
    return true;
  }

  private removeExpiredEntries(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }

  private rateLimited(): ApiException {
    return new ApiException({
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many requests.',
    });
  }
}
