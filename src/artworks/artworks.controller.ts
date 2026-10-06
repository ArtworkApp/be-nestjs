import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetArtworksQueryDto } from './dto/get-artworks-query.dto';
import { ArtworksService } from './artworks.service';

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Get()
  async getArtworks(@Query() query: GetArtworksQueryDto) {
    return this.artworksService.getArtworks(query);
  }

  @Get(':id')
  async getArtwork(@Param('id') id: string) {
    return this.artworksService.getArtwork(id);
  }
}
