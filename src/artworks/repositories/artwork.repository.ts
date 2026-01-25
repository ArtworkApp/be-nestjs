import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ArtworkCategory, ListingStatus } from '../../common/enums';
import { Artwork } from '../entities/artwork.entity';

export interface ArtworkSearchFilters {
  category?: ArtworkCategory;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  sellerId?: string;
  status?: ListingStatus;
  query?: string;
}

export interface ArtworkSortOptions {
  sortBy?: 'price' | 'createdAt' | 'viewCount';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ArtworkRepository {
  constructor(
    @InjectRepository(Artwork)
    private readonly artworkRepository: Repository<Artwork>,
  ) {}

  async create(artworkData: Partial<Artwork>): Promise<Artwork> {
    const artwork = this.artworkRepository.create(artworkData);
    return this.artworkRepository.save(artwork);
  }

  async findById(id: string): Promise<Artwork | null> {
    return this.artworkRepository.findOne({
      where: { id },
      relations: ['seller'],
    });
  }

  async findBySeller(
    sellerId: string,
    skip = 0,
    take = 10,
  ): Promise<[Artwork[], number]> {
    return this.artworkRepository.findAndCount({
      where: { sellerId },
      relations: ['seller'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateData: Partial<Artwork>,
  ): Promise<Artwork | null> {
    await this.artworkRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.artworkRepository.delete(id);
  }

  async search(
    filters: ArtworkSearchFilters,
    sortOptions: ArtworkSortOptions = {},
    skip = 0,
    take = 10,
  ): Promise<[Artwork[], number]> {
    const queryBuilder = this.artworkRepository
      .createQueryBuilder('artwork')
      .leftJoinAndSelect('artwork.seller', 'seller');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('artwork.status = :status', {
        status: filters.status,
      });
    } else {
      // Default to active listings only
      queryBuilder.andWhere('artwork.status = :status', {
        status: ListingStatus.ACTIVE,
      });
    }

    if (filters.category) {
      queryBuilder.andWhere('artwork.category = :category', {
        category: filters.category,
      });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('artwork.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('artwork.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.sellerId) {
      queryBuilder.andWhere('artwork.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    if (filters.query) {
      queryBuilder.andWhere(
        '(artwork.title ILIKE :query OR artwork.description ILIKE :query OR :query = ANY(artwork.tags))',
        { query: `%${filters.query}%` },
      );
    }

    // Apply sorting
    const { sortBy = 'createdAt', sortOrder = 'DESC' } = sortOptions;
    queryBuilder.orderBy(`artwork.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(take);

    return queryBuilder.getManyAndCount();
  }

  async findFeatured(take = 10): Promise<Artwork[]> {
    return this.artworkRepository.find({
      where: {
        isFeatured: true,
        status: ListingStatus.ACTIVE,
      },
      relations: ['seller'],
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findRecent(take = 10): Promise<Artwork[]> {
    return this.artworkRepository.find({
      where: { status: ListingStatus.ACTIVE },
      relations: ['seller'],
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategory(
    category: ArtworkCategory,
    take = 10,
  ): Promise<Artwork[]> {
    return this.artworkRepository.find({
      where: {
        category,
        status: ListingStatus.ACTIVE,
      },
      relations: ['seller'],
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.artworkRepository.increment({ id }, 'viewCount', 1);
  }

  async updateStatus(id: string, status: ListingStatus): Promise<void> {
    await this.artworkRepository.update(id, { status });
  }

  async getCategoryStats(): Promise<
    { category: ArtworkCategory; count: number }[]
  > {
    return this.artworkRepository
      .createQueryBuilder('artwork')
      .select('artwork.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('artwork.status = :status', { status: ListingStatus.ACTIVE })
      .groupBy('artwork.category')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  async exists(where: FindOptionsWhere<Artwork>): Promise<boolean> {
    const count = await this.artworkRepository.count({ where });
    return count > 0;
  }
}
