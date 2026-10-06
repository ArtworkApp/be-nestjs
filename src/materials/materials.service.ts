import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GetMaterialsQueryDto } from './dto/get-materials-query.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMaterials(query: GetMaterialsQueryDto = {}) {
    const where: Prisma.MaterialWhereInput = {
      active: true,
      ...(query.artworkTypeId !== undefined
        ? { artworkTypeId: BigInt(query.artworkTypeId) }
        : {}),
      ...(query.search
        ? {
            name: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const data = await this.prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { artworkType: true },
    });

    return {
      data: data.map((material) => ({
        id: material.id.toString(),
        name: material.name,
        active: material.active,
        artworkTypeId: material.artworkTypeId.toString(),
        artworkType: material.artworkType
          ? {
              id: material.artworkType.id.toString(),
              name: material.artworkType.name,
            }
          : null,
      })),
    };
  }
}
