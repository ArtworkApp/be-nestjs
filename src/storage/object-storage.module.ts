import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: ObjectStorageService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new ObjectStorageService(configService),
    },
  ],
  exports: [ObjectStorageService],
})
export class ObjectStorageModule {}
