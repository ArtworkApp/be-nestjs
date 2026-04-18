import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { beforeEach, describe, it } from 'node:test';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'app.apiPrefix' ? 'api/v1' : undefined,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return config-only index payload', () => {
      expect(appController.getIndex()).toEqual({
        message: 'Configuration-only mode. See Swagger docs.',
        swagger: '/api/v1/docs',
      });
    });
  });
});
