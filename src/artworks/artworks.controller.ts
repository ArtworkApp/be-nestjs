import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
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

  @Get(':id/images/:imageId')
  async getArtworkImage(
    @Param('id') artworkId: string,
    @Param('imageId') imageId: string,
    @Res() response: Response,
  ) {
    await this.artworksService.streamArtworkImage({
      artworkId,
      imageId,
      response,
    });
  }
}
