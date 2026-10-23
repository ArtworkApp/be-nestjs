import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CredentialsService } from './credentials.service';

describe('CredentialsService login', () => {
  let service: CredentialsService;
  let findUnique: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    const prisma = { user: { findUnique } };
    service = new CredentialsService(prisma as unknown as PrismaService);
  });

  it('normalizes the email, verifies the password, and returns only public profile fields', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    findUnique.mockResolvedValue({
      id: '8d15334b-61d2-4aca-99b8-d633523d098b',
      email: 'person@example.com',
      displayName: 'Person',
      avatarUrl: null,
      passwordHash,
    });

    const profile = await service.verifyCredentials(
      ' Person@Example.com ',
      'correct-password',
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        passwordHash: true,
      },
    });
    expect(profile).toEqual({
      id: '8d15334b-61d2-4aca-99b8-d633523d098b',
      email: 'person@example.com',
      displayName: 'Person',
      avatarUrl: null,
    });
  });

  it('returns INVALID_CREDENTIALS for a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    findUnique.mockResolvedValue({
      id: '8d15334b-61d2-4aca-99b8-d633523d098b',
      email: 'person@example.com',
      displayName: null,
      avatarUrl: null,
      passwordHash,
    });

    await expect(
      service.verifyCredentials('person@example.com', 'wrong-password'),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        },
      },
    });
  });

  it('returns the same error for an unknown email', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.verifyCredentials('missing@example.com', 'wrong-password'),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        },
      },
    });
  });
});
