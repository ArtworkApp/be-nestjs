import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;
}
