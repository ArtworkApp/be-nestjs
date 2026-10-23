import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { CredentialsService, UserProfile } from './credentials.service';
import { RegisterDto } from './dto/register.dto';
import { SessionService, SessionToken } from './session.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

interface SessionPresentation {
  user: UserProfile;
  tokens: SessionToken;
  client?: 'web' | 'mobile';
  response: Response;
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
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const user = await this.credentials.register(body.email, body.password);
    const tokens = await this.sessions.createSession(user.id);
    return this.presentSession({ user, tokens, client: body.client, response });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
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

  private presentSession(options: SessionPresentation): AuthResponse {
    const { user, tokens, client, response } = options;
    response.setHeader('Cache-Control', 'no-store');
    if (client === 'mobile') {
      return { user, ...tokens };
    }

    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv !== 'development',
      path: '/',
      ...(nodeEnv === 'production'
        ? { domain: this.config.getOrThrow<string>('AUTH_COOKIE_DOMAIN') }
        : {}),
    };
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
}
