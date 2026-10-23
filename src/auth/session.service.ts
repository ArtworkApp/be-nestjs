import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { sessionExpired } from './auth-errors';
import { UserProfile } from './credentials.service';

export interface SessionToken {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshedSession {
  user: UserProfile;
  tokens: SessionToken;
}

interface RefreshClaims {
  sub: string;
  purpose: string;
  jti: string;
}

interface IssuedTokens {
  tokens: SessionToken;
  refreshId: string;
  expiresAt: Date;
}

class RefreshConflictError extends Error {}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createSession(userId: string): Promise<SessionToken> {
    const issued = await this.issueTokens(userId);
    await this.prisma.refreshToken.create({
      data: {
        id: issued.refreshId,
        userId,
        familyId: randomUUID(),
        tokenHash: this.hashToken(issued.tokens.refreshToken),
        expiresAt: issued.expiresAt,
      },
    });
    return issued.tokens;
  }

  async refreshSession(refreshToken: string): Promise<RefreshedSession> {
    const claims = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const oldRow = await this.prisma.refreshToken.findUnique({
      where: { id: claims.jti },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    const now = new Date(Date.now());
    if (
      !oldRow ||
      oldRow.userId !== claims.sub ||
      oldRow.tokenHash !== tokenHash ||
      oldRow.expiresAt <= now
    ) {
      throw sessionExpired();
    }
    if (oldRow.revokedAt) {
      if (oldRow.replacedById) {
        await this.revokeFamily(oldRow.userId, oldRow.familyId);
      }
      throw sessionExpired();
    }

    const issued = await this.issueTokens(oldRow.userId);
    try {
      await this.prisma.$transaction(async (transaction) => {
        const rotated = await transaction.refreshToken.updateMany({
          where: {
            id: oldRow.id,
            userId: oldRow.userId,
            tokenHash,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { revokedAt: now, replacedById: issued.refreshId },
        });
        if (rotated.count !== 1) {
          throw new RefreshConflictError();
        }
        await transaction.refreshToken.create({
          data: {
            id: issued.refreshId,
            userId: oldRow.userId,
            familyId: oldRow.familyId,
            tokenHash: this.hashToken(issued.tokens.refreshToken),
            expiresAt: issued.expiresAt,
          },
        });
      });
    } catch (error) {
      if (error instanceof RefreshConflictError) {
        await this.revokeFamily(oldRow.userId, oldRow.familyId);
        throw sessionExpired();
      }
      throw error;
    }
    return { user: oldRow.user, tokens: issued.tokens };
  }

  private async issueTokens(userId: string): Promise<IssuedTokens> {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    const audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
    const accessTtl = this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    const refreshTtl = this.config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );
    const refreshId = randomUUID();

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

    return {
      tokens: { accessToken, refreshToken },
      refreshId,
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
    };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshClaims> {
    let claims: RefreshClaims;
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    const audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
    try {
      claims = await this.jwt.verifyAsync<RefreshClaims>(token, {
        secret,
        issuer,
        audience,
      });
    } catch {
      throw sessionExpired();
    }
    if (
      claims.purpose !== 'refresh' ||
      !isUUID(claims.sub) ||
      !isUUID(claims.jti)
    ) {
      throw sessionExpired();
    }
    return claims;
  }

  private async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: new Date(Date.now()) },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
