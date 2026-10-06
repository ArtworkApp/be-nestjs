import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ArtworksController } from './artworks.controller';
import { ArtworksService } from './artworks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ArtworksController],
  providers: [ArtworksService],
})
export class ArtworksModule {}
