import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RefreshDto } from './refresh.dto';

describe('RefreshDto', () => {
  it('accepts an empty web body or a mobile refresh token', () => {
    expect(validateSync(plainToInstance(RefreshDto, {}))).toEqual([]);
    expect(
      validateSync(
        plainToInstance(RefreshDto, { refreshToken: 'signed.jwt.token' }),
      ),
    ).toEqual([]);
  });

  it('rejects a non-string refresh token', () => {
    const errors = validateSync(
      plainToInstance(RefreshDto, { refreshToken: 123 }),
    );

    expect(errors.map((error) => error.property)).toContain('refreshToken');
  });
});
