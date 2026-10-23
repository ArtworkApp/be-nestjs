import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts a valid email and a password of at least 12 characters', () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'Person@Example.com',
      password: 'long-password',
      client: 'mobile',
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it('rejects invalid email, short password, and unsupported client', () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'not-an-email',
      password: 'short',
      client: 'desktop',
    });

    expect(validateSync(dto).map((error) => error.property)).toEqual([
      'email',
      'password',
      'client',
    ]);
  });
});
