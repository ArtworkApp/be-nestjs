import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { ApiException } from '../common/errors/api.exception';
import { readAuthCookie } from './auth-cookie';
import { sessionExpired } from './auth-errors';
import { assertAuthWriteRequest } from './auth-request-policy';
import { AuthRateLimit, AuthRateLimitGuard } from './auth-rate-limit.guard';
import { CredentialsService, UserProfile } from './credentials.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SessionService, SessionToken } from './session.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

interface SessionPresentation {
  user: UserProfile;
  tokens: SessionToken;
  client?: 'web' | 'mobile';
  response: Response;
}

interface RefreshTransport {
  token: string;
  client: 'web' | 'mobile';
}

type AuthResponse =
  | { user: UserProfile }
  | ({ user: UserProfile } & SessionToken);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AuthRateLimit(5, 60_000)
  @UseGuards(AuthRateLimitGuard)
  async register(
    @Req() request: Request,
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    assertAuthWriteRequest(request, body.client ?? 'web', this.config);
    const user = await this.credentials.register(body.email, body.password);
    const tokens = await this.sessions.createSession(user.id);
    return this.presentSession({ user, tokens, client: body.client, response });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit(10, 60_000)
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Req() request: Request,
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    assertAuthWriteRequest(request, body.client ?? 'web', this.config);
    const user = await this.credentials.verifyCredentials(
      body.email,
      body.password,
    );
    const tokens = await this.sessions.createSession(user.id);
    return this.presentSession({ user, tokens, client: body.client, response });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser() user: UserProfile,
    @Res({ passthrough: true }) response: Response,
  ): { user: UserProfile } {
    response.setHeader('Cache-Control', 'no-store');
    return { user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit(30, 60_000)
  @UseGuards(AuthRateLimitGuard)
  async refresh(
    @Req() request: Request,
    @Body() body: RefreshDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { token, client } = this.readRefreshTransport(request, body);
    assertAuthWriteRequest(request, client, this.config);
    const { user, tokens } = await this.sessions.refreshSession(token);
    return this.presentSession({ user, tokens, client, response });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Body() body: RefreshDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const { token, client } = this.readRefreshTransport(request, body);
    assertAuthWriteRequest(request, client, this.config);
    await this.sessions.logoutSession(token);
    response.setHeader('Cache-Control', 'no-store');
    if (client === 'web') {
      const options = this.cookieOptions();
      response.clearCookie('artwork_access', options);
      response.clearCookie('artwork_refresh', options);
    }
  }

  private readRefreshTransport(
    request: Request,
    body: RefreshDto,
  ): RefreshTransport {
    const cookieToken = readAuthCookie(request, 'artwork_refresh');
    const bodyToken = body?.refreshToken;
    if (
      cookieToken &&
      body &&
      Object.prototype.hasOwnProperty.call(body, 'refreshToken')
    ) {
      throw new ApiException({
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'Use either a refresh cookie or a refresh token body.',
      });
    }
    const refreshToken = cookieToken || bodyToken;
    if (!refreshToken) {
      throw sessionExpired();
    }
    return { token: refreshToken, client: cookieToken ? 'web' : 'mobile' };
  }

  private presentSession(options: SessionPresentation): AuthResponse {
    const { user, tokens, client, response } = options;
    response.setHeader('Cache-Control', 'no-store');
    if (client === 'mobile') {
      return { user, ...tokens };
    }

    const cookieOptions = this.cookieOptions();
    response.cookie('artwork_access', tokens.accessToken, {
      ...cookieOptions,
      maxAge: this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS') * 1000,
    });
    response.cookie('artwork_refresh', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: this.config.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS') * 1000,
    });
    return { user };
  }

  private cookieOptions(): CookieOptions {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv !== 'development',
      path: '/',
      ...(nodeEnv === 'production'
        ? { domain: this.config.getOrThrow<string>('AUTH_COOKIE_DOMAIN') }
        : {}),
    };
  }
}
