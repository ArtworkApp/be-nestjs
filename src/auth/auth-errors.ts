import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception';

export function sessionExpired(): ApiException {
  return new ApiException({
    status: HttpStatus.UNAUTHORIZED,
    code: 'SESSION_EXPIRED',
    message: 'Session has expired. Please sign in again.',
  });
}
