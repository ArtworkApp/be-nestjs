import { Prisma } from '@prisma/client';

describe('account recovery database contract', () => {
  it('provides reset-token storage and a default session version', () => {
    const user = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'User',
    );
    const token = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'PasswordResetToken',
    );
    const version = user?.fields.find(
      (field) => field.name === 'sessionVersion',
    );

    expect(version).toMatchObject({ type: 'Int', dbName: 'session_version' });
    expect(token?.dbName).toBe('password_reset_tokens');
    expect(
      token?.fields.find((field) => field.name === 'tokenHash'),
    ).toMatchObject({ type: 'String', dbName: 'token_hash' });
    expect(token?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'userId',
        'expiresAt',
        'usedAt',
        'invalidatedAt',
        'createdAt',
        'user',
      ]),
    );
  });

  it('provides encrypted email jobs with lease and retry fields', () => {
    const job = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'EmailJob',
    );
    expect(job?.dbName).toBe('email_jobs');
    expect(
      job?.fields.find((field) => field.name === 'idempotencyKey'),
    ).toMatchObject({ type: 'String', dbName: 'idempotency_key' });
    expect(
      job?.fields.find((field) => field.name === 'encryptedPayload'),
    ).toMatchObject({ type: 'Bytes', dbName: 'encrypted_payload' });
    expect(job?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'userId',
        'kind',
        'status',
        'attempts',
        'availableAt',
        'expiresAt',
        'leaseId',
        'leaseExpiresAt',
        'payloadKeyId',
        'lastErrorCode',
        'createdAt',
        'updatedAt',
        'user',
      ]),
    );
  });
});
