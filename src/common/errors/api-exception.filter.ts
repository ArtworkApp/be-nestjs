import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError } from './api.exception';

function isApiError(value: unknown): value is { error: ApiError } {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException) || status >= 500) {
      response.status(status).json({ error: this.serverError() });
      return;
    }

    const exceptionResponse = exception.getResponse();
    if (isApiError(exceptionResponse)) {
      response.status(status).json({ error: exceptionResponse.error });
      return;
    }

    response.status(status).json({ error: this.errorForStatus(exception) });
  }

  private errorForStatus(exception: HttpException): ApiError {
    switch (exception.getStatus()) {
      case HttpStatus.BAD_REQUEST:
        return this.badRequestError(exception);
      case HttpStatus.UNAUTHORIZED:
        return this.unauthorizedError();
      case HttpStatus.FORBIDDEN:
        return this.forbiddenError();
      case HttpStatus.NOT_FOUND:
        return this.notFoundError(exception);
      case HttpStatus.CONFLICT:
        return this.conflictError(exception);
      case HttpStatus.TOO_MANY_REQUESTS:
        return this.rateLimitError();
      default:
        return { code: 'HTTP_ERROR', message: exception.message };
    }
  }

  private badRequestError(exception: HttpException): ApiError {
    const body = exception.getResponse();
    const isValidationError =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      Array.isArray(body.message);
    return isValidationError
      ? { code: 'VALIDATION_ERROR', message: 'Request validation failed.' }
      : { code: 'BAD_REQUEST', message: 'Bad request.' };
  }

  private unauthorizedError(): ApiError {
    return { code: 'UNAUTHENTICATED', message: 'Authentication required.' };
  }

  private forbiddenError(): ApiError {
    return { code: 'FORBIDDEN', message: 'Access denied.' };
  }

  private notFoundError(exception: HttpException): ApiError {
    return { code: 'NOT_FOUND', message: exception.message };
  }

  private conflictError(exception: HttpException): ApiError {
    return { code: 'CONFLICT', message: exception.message };
  }

  private rateLimitError(): ApiError {
    return { code: 'RATE_LIMITED', message: 'Too many requests.' };
  }

  private serverError(): ApiError {
    return { code: 'INTERNAL_ERROR', message: 'Internal server error.' };
  }
}
