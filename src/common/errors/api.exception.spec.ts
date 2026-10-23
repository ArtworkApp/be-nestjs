import { HttpStatus } from '@nestjs/common';
import { ApiException } from './api.exception';

describe('ApiException', () => {
  it('carries the HTTP status and public error details', () => {
    const exception = new ApiException({
      status: HttpStatus.CONFLICT,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists.',
    });

    expect(exception.getStatus()).toBe(409);
    expect(exception.getResponse()).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists.',
      },
    });
  });

  it('can carry validation messages by field', () => {
    const exception = new ApiException({
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      fields: { email: ['Enter a valid email.'] },
    });

    expect(exception.getResponse()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        fields: { email: ['Enter a valid email.'] },
      },
    });
  });
});
