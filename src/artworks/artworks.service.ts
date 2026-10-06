import { Injectable, NotFoundException } from '@nestjs/common';
import { ArtworkStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GetArtworksQueryDto } from './dto/get-artworks-query.dto';

@Injectable()
export class ArtworksService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtworks(query: GetArtworksQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 21, 21);
    const skip = (page - 1) * limit;

    const materialIds = this.parseMaterialIds(query.materialIds);
    const filters: Prisma.ArtworkWhereInput[] = [
      { status: { equals: ArtworkStatus.AVAILABLE } },
      ...(query.artistId ? [{ artists: { some: { artistId: BigInt(query.artistId) } } }] : []),
      ...(query.artworkTypeId
        ? [{ artworkTypes: { some: { artworkTypeId: BigInt(query.artworkTypeId) } } }]
        : []),
      ...(materialIds.length
        ? [{ materials: { some: { materialId: { in: materialIds.map((id) => BigInt(id)) } } } }]
        : []),
      ...(query.yearStart !== undefined || query.yearEnd !== undefined
        ? [
            {
              yearMade:
                query.yearStart !== undefined || query.yearEnd !== undefined
                  ? {
                      ...(query.yearStart !== undefined ? { gte: query.yearStart } : {}),
                      ...(query.yearEnd !== undefined ? { lte: query.yearEnd } : {}),
                    }
                  : undefined,
            },
          ]
        : []),
      ...(query.country
        ? [
            {
              artists: {
                some: {
                  artist: {
                    country: {
                      contains: query.country,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            },
          ]
        : []),
    ];

    const where: Prisma.ArtworkWhereInput =
      filters.length === 1 ? filters[0] : { AND: filters };

    const orderBy = this.getOrderBy(query.sort);
    const [artworks, total] = await Promise.all([
      this.prisma.artwork.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          artists: { include: { artist: true } },
          artworkTypes: { include: { artworkType: true } },
          materials: { include: { material: true } },
        },
      }),
      this.prisma.artwork.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: artworks.map((artwork) => this.serializeArtwork(artwork)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getArtwork(id: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: BigInt(id) },
      include: {
        artists: { include: { artist: true } },
        artworkTypes: { include: { artworkType: true } },
        materials: { include: { material: true } },
      },
    });

    if (!artwork) {
      throw new NotFoundException(`Artwork with id ${id} was not found`);
    }

    return this.serializeArtwork(artwork);
  }

  private parseMaterialIds(raw?: string): string[] {
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value))
      .sort((left, right) => left - right)
      .map((value) => value.toString());
  }

  private getOrderBy(sort?: string): Prisma.ArtworkOrderByWithRelationInput[] {
    switch (sort ?? 'year_desc') {
      case 'year_asc':
        return [{ yearMade: 'asc' }, { id: 'asc' }];
      case 'year_desc':
        return [{ yearMade: 'desc' }, { id: 'desc' }];
      case 'artist_asc':
        return [{ artists: { _count: 'asc' } } as Prisma.ArtworkOrderByWithRelationInput];
      case 'artist_desc':
        return [{ artists: { _count: 'desc' } } as Prisma.ArtworkOrderByWithRelationInput];
      case 'price_asc':
        return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { id: 'desc' }];
      default:
        return [{ yearMade: 'desc' }, { id: 'desc' }];
    }
  }

  private serializeArtwork(artwork: any) {
    return {
      id: artwork.id.toString(),
      title: artwork.title,
      yearMade: artwork.yearMade,
      price: artwork.price !== null && artwork.price !== undefined ? Number(artwork.price) : null,
      currency: artwork.currency,
      width: artwork.width !== null && artwork.width !== undefined ? Number(artwork.width) : null,
      height: artwork.height !== null && artwork.height !== undefined ? Number(artwork.height) : null,
      depth: artwork.depth !== null && artwork.depth !== undefined ? Number(artwork.depth) : null,
      status: artwork.status,
      featured: artwork.featured,
      details: artwork.details,
      artist: (artwork.artists ?? []).map((entry: any) => ({
        id: entry.artist.id.toString(),
        name: entry.artist.name,
        country: entry.artist.country,
      })),
      artworkType: (artwork.artworkTypes ?? []).map((entry: any) => ({
        id: entry.artworkType.id.toString(),
        name: entry.artworkType.name,
      })),
      material: (artwork.materials ?? []).map((entry: any) => ({
        id: entry.material.id.toString(),
        name: entry.material.name,
      })),
      createdAt: artwork.createdAt,
      updatedAt: artwork.updatedAt,
    };
  }
}
