import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectStorageModule } from './object-storage.module';
import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              storage: {
                endpoint: 'http://127.0.0.1:9000',
                bucket: 'artwork-images',
              },
            }),
          ],
        }),
        ObjectStorageModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    await module?.close();
  });

  it('provides ObjectStorageService from configuration', () => {
    expect(module.get(ObjectStorageService)).toBeInstanceOf(
      ObjectStorageService,
    );
  });
});
