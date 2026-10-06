import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ArtistsModule } from './artists/artists.module';
import { ArtworkTypesModule } from './artwork-types/artwork-types.module';
import { ArtworksModule } from './artworks/artworks.module';
import { MaterialsModule } from './materials/materials.module';
import { CustomLoggerService } from './common/logger/logger.service';
import configuration, { configValidationSchema } from './config/configuration';
import { DatabaseModule } from './database/database.module';

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
    ArtistsModule,
    ArtworksModule,
    ArtworkTypesModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [CustomLoggerService],
})
export class AppModule {}
