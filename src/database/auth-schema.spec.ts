import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Prisma } from '@prisma/client';

const migrationPath = resolve(
  __dirname,
  '../../prisma/migrations/20261022000000_add_auth_schema/migration.sql',
);

describe('authentication database contract', () => {
  it('exposes the required user and refresh-token fields in the generated client', () => {
    const user = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'User',
    );
    const refreshToken = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'RefreshToken',
    );

    expect(user).toBeDefined();
    expect(user?.dbName).toBe('users');
    expect(user?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'id',
        'email',
        'passwordHash',
        'displayName',
        'avatarUrl',
        'createdAt',
        'updatedAt',
        'refreshTokens',
      ]),
    );

    expect(refreshToken).toBeDefined();
    expect(refreshToken?.dbName).toBe('refresh_tokens');
    expect(refreshToken?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'familyId',
        'tokenHash',
        'expiresAt',
        'revokedAt',
        'replacedById',
        'createdAt',
        'user',
      ]),
    );
  });

  it('migrates the database with required columns, unique keys, and cascading tokens', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/CREATE TABLE "users"/);
    expect(sql).toMatch(/"email" TEXT NOT NULL/);
    expect(sql).toMatch(/"password_hash" TEXT NOT NULL/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "users_email_key"/);
    expect(sql).toMatch(/CREATE TABLE "refresh_tokens"/);
    expect(sql).toMatch(/"family_id" UUID NOT NULL/);
    expect(sql).toMatch(/"token_hash" TEXT NOT NULL/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "refresh_tokens_token_hash_key"/);
    expect(sql).toMatch(/REFERENCES "users"\("id"\) ON DELETE CASCADE/);
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE TABLE/);
  });
});
