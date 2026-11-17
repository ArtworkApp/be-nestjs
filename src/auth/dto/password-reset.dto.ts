import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class PasswordResetRequestDto {
  @IsEmail()
  email: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;

  @IsString()
  @MinLength(12)
  password: string;
}
