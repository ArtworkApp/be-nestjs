import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { ArtistsModule } from './artists/artists.module';
import { ArtworkTypesModule } from './artwork-types/artwork-types.module';
import { ArtworksModule } from './artworks/artworks.module';
import { AuthModule } from './auth/auth.module';
import { MaterialsModule } from './materials/materials.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import configuration, { configValidationSchema } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ObjectStorageModule } from './storage/object-storage.module';
import { EmailModule } from './email/email.module';
import { EmailWorkerLauncher } from './email/email-worker-launcher';
import { EmailWorkerRootModule } from './email/email-worker-root.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    DatabaseModule,
    AuthModule,
    ObjectStorageModule,
    EmailModule,
    ArtistsModule,
    ArtworksModule,
    ArtworkTypesModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [
    CustomLoggerService,
    {
      provide: EmailWorkerLauncher,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new EmailWorkerLauncher(config, () =>
          NestFactory.createApplicationContext(EmailWorkerRootModule),
        ),
    },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
