import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CredentialsService } from './credentials.service';

describe('CredentialsService registration', () => {
  let service: CredentialsService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
    };
    prisma.user.findUnique.mockResolvedValue(null);
    service = new CredentialsService(prisma as unknown as PrismaService);
  });

  it('normalizes email, hashes the password, and returns only public fields', async () => {
    const profile = {
      id: '8d15334b-61d2-4aca-99b8-d633523d098b',
      email: 'person@example.com',
      displayName: null,
      avatarUrl: null,
    };
    prisma.user.create.mockResolvedValue(profile);

    const result = await service.register(
      ' Person@Example.com ',
      'long-example-password',
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      select: { id: true },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'person@example.com',
        passwordHash: expect.any(String),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    const createInput = prisma.user.create.mock.calls[0][0];
    expect(createInput.data.passwordHash).not.toBe('long-example-password');
    await expect(
      bcrypt.compare('long-example-password', createInput.data.passwordHash),
    ).resolves.toBe(true);
    expect(result).toEqual(profile);
  });

  it('rejects an email that already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register('Person@Example.com', 'long-example-password'),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: {
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
        },
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('translates a concurrent unique-index failure to the same error', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register('Person@Example.com', 'long-example-password'),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: {
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
        },
      },
    });
  });
});
