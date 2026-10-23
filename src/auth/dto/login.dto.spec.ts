import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('accepts valid email and any string password', () => {
    const dto = plainToInstance(LoginDto, {
      email: 'Person@Example.com',
      password: 'short',
      client: 'mobile',
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it('rejects invalid email, non-string password, and unsupported client', () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 123456,
      client: 'desktop',
    });

    expect(validateSync(dto).map((error) => error.property)).toEqual([
      'email',
      'password',
      'client',
    ]);
  });
});
