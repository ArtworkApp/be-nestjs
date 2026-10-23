import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';

export interface SessionToken {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createSession(userId: string): Promise<SessionToken> {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    const audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
    const accessTtl = this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    const refreshTtl = this.config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );
    const refreshId = randomUUID();
    const familyId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, purpose: 'access', jti: randomUUID() },
        { secret: accessSecret, issuer, audience, expiresIn: accessTtl },
      ),
      this.jwt.signAsync(
        { sub: userId, purpose: 'refresh', jti: refreshId },
        { secret: refreshSecret, issuer, audience, expiresIn: refreshTtl },
      ),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshId,
        userId,
        familyId,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
