import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArtworkStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { GetArtworksQueryDto } from './dto/get-artworks-query.dto';

export interface ArtworkImageResponse {
  id: string;
  url: string;
  altText: string | null;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
  originalFilename: string;
}

interface StreamArtworkImageOptions {
  artworkId: string;
  imageId: string;
  response: Response;
}

type ArtworkWithRelations = Prisma.ArtworkGetPayload<{
  include: {
    artists: { include: { artist: true } };
    artworkTypes: { include: { artworkType: true } };
    materials: { include: { material: true } };
    images: true;
  };
}>;

@Injectable()
export class ArtworksService {
  private readonly logger = new Logger(ArtworksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly configService: ConfigService,
  ) {}

  async getArtworks(query: GetArtworksQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 21, 21);
    const skip = (page - 1) * limit;

    const materialIds = this.parseMaterialIds(query.materialIds);
    const filters: Prisma.ArtworkWhereInput[] = [
      { status: { equals: ArtworkStatus.AVAILABLE } },
      ...(query.artistId
        ? [{ artists: { some: { artistId: BigInt(query.artistId) } } }]
        : []),
      ...(query.artworkTypeId
        ? [
            {
              artworkTypes: {
                some: { artworkTypeId: BigInt(query.artworkTypeId) },
              },
            },
          ]
        : []),
      ...(materialIds.length
        ? [
            {
              materials: {
                some: {
                  materialId: { in: materialIds.map((id) => BigInt(id)) },
                },
              },
            },
          ]
        : []),
      ...(query.yearStart !== undefined || query.yearEnd !== undefined
        ? [
            {
              yearMade:
                query.yearStart !== undefined || query.yearEnd !== undefined
                  ? {
                      ...(query.yearStart !== undefined
                        ? { gte: query.yearStart }
                        : {}),
                      ...(query.yearEnd !== undefined
                        ? { lte: query.yearEnd }
                        : {}),
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
          images: {
            where: { isPrimary: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            take: 1,
          },
        },
      }),
      this.prisma.artwork.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: artworks.map((artwork) => this.serializeArtwork(artwork)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getArtwork(id: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: BigInt(id) },
      include: {
        artists: { include: { artist: true } },
        artworkTypes: { include: { artworkType: true } },
        materials: { include: { material: true } },
        images: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!artwork) {
      throw new NotFoundException(`Artwork with id ${id} was not found`);
    }

    return this.serializeArtwork(artwork);
  }

  async streamArtworkImage(options: StreamArtworkImageOptions): Promise<void> {
    const imageId = BigInt(options.imageId);
    const artworkId = BigInt(options.artworkId);
    const artworkImage = await this.prisma.artworkImage.findUnique({
      where: { id: imageId },
    });

    if (!artworkImage || artworkImage.artworkId !== artworkId) {
      throw new NotFoundException(
        `Artwork image ${options.imageId} was not found for artwork ${options.artworkId}`,
      );
    }

    const object = await this.objectStorageService.getObjectStream(
      artworkImage.objectKey,
    );
    options.response.setHeader(
      'Content-Type',
      object.contentType || artworkImage.mimeType,
    );
    options.response.setHeader('Cache-Control', 'public, max-age=86400');
    if (object.contentLength !== undefined) {
      options.response.setHeader(
        'Content-Length',
        object.contentLength.toString(),
      );
    }
    this.pipeStreamToResponse(object.stream, options.response);
  }

  private pipeStreamToResponse(
    sourceStream: NodeJS.ReadableStream,
    response: Response,
  ): void {
    sourceStream.on('error', (error) => {
      if (!response.headersSent) {
        response.status(500).json({ message: 'Failed to stream image' });
      } else {
        response.destroy();
      }
      this.logger.error('Stream error during image delivery', error);
    });

    response.on('error', (error) => {
      (sourceStream as any).destroy?.();
      this.logger.error('Response error during image delivery', error);
    });

    sourceStream.pipe(response);
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
      case 'price_asc':
        return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { id: 'desc' }];
      default:
        return [{ yearMade: 'desc' }, { id: 'desc' }];
    }
  }

  private serializeArtwork(artwork: ArtworkWithRelations) {
    const images = (artwork.images ?? []).map((image) =>
      this.serializeArtworkImage({
        artworkId: artwork.id,
        image,
      }),
    );
    const primaryImage =
      images.find((image) => image.isPrimary) ?? images[0] ?? null;

    return {
      id: artwork.id.toString(),
      title: artwork.title,
      yearMade: artwork.yearMade,
      price:
        artwork.price !== null && artwork.price !== undefined
          ? Number(artwork.price)
          : null,
      currency: artwork.currency,
      width:
        artwork.width !== null && artwork.width !== undefined
          ? Number(artwork.width)
          : null,
      height:
        artwork.height !== null && artwork.height !== undefined
          ? Number(artwork.height)
          : null,
      depth:
        artwork.depth !== null && artwork.depth !== undefined
          ? Number(artwork.depth)
          : null,
      status: artwork.status,
      featured: artwork.featured,
      details: artwork.details,
      primaryImage,
      images,
      artist: (artwork.artists ?? []).map((entry) => ({
        id: entry.artist.id.toString(),
        name: entry.artist.name,
        country: entry.artist.country,
      })),
      artworkType: (artwork.artworkTypes ?? []).map((entry) => ({
        id: entry.artworkType.id.toString(),
        name: entry.artworkType.name,
      })),
      material: (artwork.materials ?? []).map((entry) => ({
        id: entry.material.id.toString(),
        name: entry.material.name,
      })),
      createdAt: artwork.createdAt,
      updatedAt: artwork.updatedAt,
    };
  }

  private serializeArtworkImage(options: {
    artworkId: bigint;
    image: ArtworkWithRelations['images'][number];
  }): ArtworkImageResponse {
    const apiPrefix = this.configService.getOrThrow<string>('app.apiPrefix');
    return {
      id: options.image.id.toString(),
      url: `/${apiPrefix}/artworks/${options.artworkId.toString()}/images/${options.image.id.toString()}`,
      altText: options.image.altText,
      mimeType: options.image.mimeType,
      isPrimary: options.image.isPrimary,
      sortOrder: options.image.sortOrder,
      originalFilename: options.image.originalFilename,
    };
  }
}
