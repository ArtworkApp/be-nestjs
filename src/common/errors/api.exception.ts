import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export interface ApiExceptionOptions extends ApiError {
  status: HttpStatus;
}

export class ApiException extends HttpException {
  constructor(options: ApiExceptionOptions) {
    const { status, code, message, fields } = options;
    super(
      {
        error: {
          code,
          message,
          ...(fields ? { fields } : {}),
        },
      },
      status,
    );
  }
}
