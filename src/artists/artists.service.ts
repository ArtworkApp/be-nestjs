import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GetArtistsQueryDto } from './dto/get-artists-query.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: GetArtistsQueryDto) {
    const search = query.search?.trim() ?? '';
    const limit = Math.min(query.limit ?? 10, 21);

    const data = await this.prisma.artist.findMany({
      where: search
        ? {
            name: { contains: search, mode: 'insensitive' },
          }
        : undefined,
      select: {
        id: true,
        name: true,
        country: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    return { data };
  }
}
