import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getIndex(): { message: string; swagger: string } {
    const apiPrefix =
      this.configService.get<string>('app.apiPrefix') || 'api/v1';
    return {
      message: 'Configuration-only mode. See Swagger docs.',
      swagger: `/${apiPrefix}/docs`,
    };
  }
}
