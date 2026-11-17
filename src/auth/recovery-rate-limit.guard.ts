import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Request } from 'express';
import { ApiException } from '../common/errors/api.exception';
import { PrismaService } from '../database/prisma.service';
import { AUTH_RATE_LIMIT_KEY } from './auth-rate-limit.guard';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

@Injectable()
export class RecoveryRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      AUTH_RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const address = request.ip || request.socket?.remoteAddress || 'unknown';
    const identity = `${context.getClass().name}:${
      context.getHandler().name
    }:${address}`;
    const key = createHash('sha256').update(identity).digest('hex');
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO recovery_rate_limits (key, count, reset_at)
      VALUES (${key}, 1, NOW() + ${options.windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN recovery_rate_limits.reset_at <= NOW() THEN 1 ELSE recovery_rate_limits.count + 1 END,
        reset_at = CASE WHEN recovery_rate_limits.reset_at <= NOW() THEN NOW() + ${options.windowMs} * INTERVAL '1 millisecond' ELSE recovery_rate_limits.reset_at END
      WHERE recovery_rate_limits.reset_at <= NOW() OR recovery_rate_limits.count < ${options.limit}
      RETURNING count
    `;
    if (!rows.length)
      throw new ApiException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message: 'Too many requests.',
      });
    return true;
  }
}
