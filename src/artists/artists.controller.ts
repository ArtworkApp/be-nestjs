import { Controller, Get, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { GetArtistsQueryDto } from './dto/get-artists-query.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  async getArtists(@Query() query: GetArtistsQueryDto) {
    return this.artistsService.search(query);
  }
}
