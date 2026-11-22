import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
} from './password-reset.dto';

describe('password reset DTOs', () => {
  it('accepts a valid reset request email', () => {
    const dto = plainToInstance(PasswordResetRequestDto, {
      email: 'person@example.com',
    });
    expect(validateSync(dto)).toEqual([]);
  });

  it.each([undefined, '', 'not-an-email', 123])(
    'rejects an invalid request email',
    (email) => {
      expect(
        validateSync(plainToInstance(PasswordResetRequestDto, { email }))
          .length,
      ).toBeGreaterThan(0);
    },
  );

  it('accepts a reset token and a password of at least 12 characters', () => {
    const dto = plainToInstance(PasswordResetConfirmDto, {
      token: 'a'.repeat(43),
      password: 'long-password',
    });
    expect(validateSync(dto)).toEqual([]);
  });

  it.each([undefined, '', 'short', '!'.repeat(43), 'a'.repeat(44)])(
    'rejects malformed tokens',
    (token) => {
      const dto = plainToInstance(PasswordResetConfirmDto, {
        token,
        password: 'long-password',
      });
      expect(validateSync(dto).map((error) => error.property)).toContain(
        'token',
      );
    },
  );

  it('rejects short passwords', () => {
    const dto = plainToInstance(PasswordResetConfirmDto, {
      token: 'a'.repeat(43),
      password: 'short',
    });
    expect(validateSync(dto).map((error) => error.property)).toContain(
      'password',
    );
  });
});
