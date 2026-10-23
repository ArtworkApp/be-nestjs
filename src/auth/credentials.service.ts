import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiException } from '../common/errors/api.exception';
import { PrismaService } from '../database/prisma.service';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string): Promise<UserProfile> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw this.duplicateEmailError();
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await this.prisma.user.create({
        data: { email: normalizedEmail, passwordHash },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw this.duplicateEmailError();
      }
      throw error;
    }
  }

  private duplicateEmailError(): ApiException {
    return new ApiException({
      status: HttpStatus.CONFLICT,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists.',
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
