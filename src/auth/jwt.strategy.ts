import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { ApiException } from '../common/errors/api.exception';
import { PrismaService } from '../database/prisma.service';
import { UserProfile } from './credentials.service';
import { readAuthCookie } from './auth-cookie';

interface AccessClaims {
  sub: string;
  purpose: string;
  jti: string;
}

export function extractAccessToken(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (authorization !== undefined) {
    return /^Bearer ([^\s]+)$/.exec(authorization)?.[1] ?? null;
  }

  return readAuthCookie(request, 'artwork_access');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: AccessClaims): Promise<UserProfile> {
    if (
      payload.purpose !== 'access' ||
      !isUUID(payload.sub) ||
      !isUUID(payload.jti)
    ) {
      throw this.unauthenticated();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    if (!user) {
      throw this.unauthenticated();
    }
    return user;
  }

  private unauthenticated(): ApiException {
    return new ApiException({
      status: HttpStatus.UNAUTHORIZED,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    });
  }
}
