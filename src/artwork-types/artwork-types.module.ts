import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ArtworkTypesController } from './artwork-types.controller';
import { ArtworkTypesService } from './artwork-types.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ArtworkTypesController],
  providers: [ArtworkTypesService],
})
export class ArtworkTypesModule {}
