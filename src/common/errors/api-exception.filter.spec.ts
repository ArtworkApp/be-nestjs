import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiException } from './api.exception';

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();
  let response: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
  let host: ArgumentsHost;

  beforeEach(() => {
    response = {
      status: jest.fn(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    response.status.mockReturnValue(response);
    host = {
      switchToHttp: () => ({
        getResponse: () => response as unknown as Response,
      }),
    } as ArgumentsHost;
  });

  it('wraps existing resource errors without changing the status', () => {
    filter.catch(new NotFoundException('Artwork not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Artwork not found' },
    });
  });

  it('uses the validation error code for DTO errors', () => {
    filter.catch(new BadRequestException(['page must be an integer']), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      },
    });
  });

  it('uses a safe message for other bad requests', () => {
    filter.catch(new BadRequestException('raw submitted value'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: 'Bad request.' },
    });
  });

  it.each([
    [
      401,
      new UnauthorizedException(),
      'UNAUTHENTICATED',
      'Authentication required.',
    ],
    [403, new ForbiddenException(), 'FORBIDDEN', 'Access denied.'],
    [409, new ConflictException('Email exists'), 'CONFLICT', 'Email exists'],
    [
      429,
      new HttpException('Too Many Requests', 429),
      'RATE_LIMITED',
      'Too many requests.',
    ],
  ])(
    'formats status %i with its own code and message',
    (status, exception, code, message) => {
      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(status);
      expect(response.json).toHaveBeenCalledWith({ error: { code, message } });
    },
  );

  it('preserves a documented domain error and optional field messages', () => {
    filter.catch(
      new ApiException({
        status: HttpStatus.UNAUTHORIZED,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        fields: { email: ['Enter a valid email.'] },
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        fields: { email: ['Enter a valid email.'] },
      },
    });
  });

  it('hides unexpected error details', () => {
    filter.catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
    });
  });
});
