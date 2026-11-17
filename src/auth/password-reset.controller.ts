import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { assertAuthWriteRequest } from './auth-request-policy';
import { AuthRateLimit, AuthRateLimitGuard } from './auth-rate-limit.guard';
import {
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { PasswordResetConfirmService } from './password-reset-confirm.service';
import { PasswordResetRequestService } from './password-reset-request.service';

@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(
    private readonly requests: PasswordResetRequestService,
    private readonly confirmations: PasswordResetConfirmService,
    private readonly config: ConfigService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @AuthRateLimit(5, 60000)
  @UseGuards(AuthRateLimitGuard)
  async requestReset(
    @Req() request: Request,
    @Body() body: PasswordResetRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    response.setHeader('Cache-Control', 'no-store');
    assertAuthWriteRequest(request, 'web', this.config);
    await this.requests.request(body.email);
    return {
      message:
        'If an account exists for this email address, a password reset link will be sent.',
    };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthRateLimit(10, 60000)
  @UseGuards(AuthRateLimitGuard)
  async confirmReset(
    @Req() request: Request,
    @Body() body: PasswordResetConfirmDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    assertAuthWriteRequest(request, 'web', this.config);
    await this.confirmations.confirm(body.token, body.password);
  }
}
