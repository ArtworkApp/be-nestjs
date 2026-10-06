import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GetArtworkTypesQueryDto } from './dto/get-artwork-types-query.dto';

@Injectable()
export class ArtworkTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtworkTypes(query: GetArtworkTypesQueryDto = {}) {
    const data = await this.prisma.artworkType.findMany({
      where: query.active === undefined ? { active: true } : { active: query.active },
      orderBy: { name: 'asc' },
    });

    return {
      data: data.map((artworkType) => ({
        id: artworkType.id.toString(),
        name: artworkType.name,
        active: artworkType.active,
      })),
    };
  }
}
