import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserProfile } from './credentials.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserProfile => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: UserProfile }>();
    return request.user;
  },
);
