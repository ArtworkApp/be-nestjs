import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ArtworksController } from './artworks.controller';
import { ArtworksService } from './artworks.service';
import { Artwork } from './entities/artwork.entity';
import { ArtworkRepository } from './repositories/artwork.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Artwork]), UsersModule],
  controllers: [ArtworksController],
  providers: [ArtworksService, ArtworkRepository],
  exports: [ArtworksService, ArtworkRepository],
})
export class ArtworksModule {}
