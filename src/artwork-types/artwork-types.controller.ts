import { Controller, Get, Query } from '@nestjs/common';
import { GetArtworkTypesQueryDto } from './dto/get-artwork-types-query.dto';
import { ArtworkTypesService } from './artwork-types.service';

@Controller('artwork-types')
export class ArtworkTypesController {
  constructor(private readonly artworkTypesService: ArtworkTypesService) {}

  @Get()
  async getArtworkTypes(@Query() query: GetArtworkTypesQueryDto) {
    return this.artworkTypesService.getArtworkTypes(query);
  }
}
