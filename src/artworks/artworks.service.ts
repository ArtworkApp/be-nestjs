import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArtworkCategory, ListingStatus } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ArtworkSearchDto } from './dto/artwork-search.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { Artwork } from './entities/artwork.entity';
import {
  ArtworkRepository,
  ArtworkSearchFilters,
  ArtworkSortOptions,
} from './repositories/artwork.repository';

@Injectable()
export class ArtworksService {
  constructor(
    private readonly artworkRepository: ArtworkRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(
    sellerId: string,
    createArtworkDto: CreateArtworkDto,
  ): Promise<Artwork> {
    // Validate seller exists
    await this.usersService.findById(sellerId);

    // Process and validate images
    const processedImages = await this.processImages(createArtworkDto.images);

    const artworkData = {
      ...createArtworkDto,
      sellerId,
      images: processedImages,
      status: ListingStatus.ACTIVE,
      viewCount: 0,
      isFeatured: false,
    };

    return this.artworkRepository.create(artworkData);
  }

  async findById(id: string): Promise<Artwork> {
    const artwork = await this.artworkRepository.findById(id);
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    return artwork;
  }

  async findByIdAndIncrementViews(id: string): Promise<Artwork> {
    const artwork = await this.findById(id);

    // Increment view count asynchronously
    this.artworkRepository.incrementViewCount(id).catch(() => {
      // Silently fail view count increment to not affect user experience
    });

    return artwork;
  }

  async update(
    id: string,
    userId: string,
    updateArtworkDto: UpdateArtworkDto,
  ): Promise<Artwork> {
    const artwork = await this.findById(id);

    // Check if user owns the artwork
    if (artwork.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own artworks');
    }

    // Process images if provided
    let processedImages = artwork.images;
    if (updateArtworkDto.images) {
      processedImages = await this.processImages(updateArtworkDto.images);
    }

    const updateData = {
      ...updateArtworkDto,
      images: processedImages,
    };

    const updatedArtwork = await this.artworkRepository.update(id, updateData);
    if (!updatedArtwork) {
      throw new NotFoundException('Artwork not found');
    }

    return updatedArtwork;
  }

  async delete(id: string, userId: string): Promise<void> {
    const artwork = await this.findById(id);

    // Check if user owns the artwork
    if (artwork.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own artworks');
    }

    await this.artworkRepository.delete(id);
  }

  async search(searchDto: ArtworkSearchDto): Promise<{
    artworks: Artwork[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = searchDto;
    const skip = (page - 1) * limit;

    const searchFilters: ArtworkSearchFilters = {
      ...filters,
      status: ListingStatus.ACTIVE, // Only show active listings in search
    };

    const sortOptions: ArtworkSortOptions = {
      sortBy,
      sortOrder,
    };

    const [artworks, total] = await this.artworkRepository.search(
      searchFilters,
      sortOptions,
      skip,
      limit,
    );

    return {
      artworks,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findBySeller(
    sellerId: string,
    page = 1,
    limit = 12,
  ): Promise<{
    artworks: Artwork[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    const [artworks, total] = await this.artworkRepository.findBySeller(
      sellerId,
      skip,
      limit,
    );

    return {
      artworks,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getFeatured(limit = 10): Promise<Artwork[]> {
    return this.artworkRepository.findFeatured(limit);
  }

  async getRecent(limit = 10): Promise<Artwork[]> {
    return this.artworkRepository.findRecent(limit);
  }

  async getByCategory(
    category: ArtworkCategory,
    limit = 10,
  ): Promise<Artwork[]> {
    return this.artworkRepository.findByCategory(category, limit);
  }

  async getCategoryStats(): Promise<
    { category: ArtworkCategory; count: number }[]
  > {
    return this.artworkRepository.getCategoryStats();
  }

  async updateStatus(
    id: string,
    userId: string,
    status: ListingStatus,
  ): Promise<Artwork> {
    const artwork = await this.findById(id);

    // Check if user owns the artwork
    if (artwork.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own artworks');
    }

    await this.artworkRepository.updateStatus(id, status);
    return this.findById(id);
  }

  async markAsSold(id: string, userId: string): Promise<Artwork> {
    return this.updateStatus(id, userId, ListingStatus.SOLD);
  }

  async markAsInactive(id: string, userId: string): Promise<Artwork> {
    return this.updateStatus(id, userId, ListingStatus.INACTIVE);
  }

  async reactivateListing(id: string, userId: string): Promise<Artwork> {
    return this.updateStatus(id, userId, ListingStatus.ACTIVE);
  }

  async toggleFeatured(id: string): Promise<Artwork> {
    const artwork = await this.findById(id);
    const updatedArtwork = await this.artworkRepository.update(id, {
      isFeatured: !artwork.isFeatured,
    });

    if (!updatedArtwork) {
      throw new NotFoundException('Artwork not found');
    }

    return updatedArtwork;
  }

  async validateOwnership(artworkId: string, userId: string): Promise<boolean> {
    try {
      const artwork = await this.findById(artworkId);
      return artwork.sellerId === userId;
    } catch {
      return false;
    }
  }

  async getArtworksByIds(artworkIds: string[]): Promise<Artwork[]> {
    const artworks: Artwork[] = [];
    for (const id of artworkIds) {
      try {
        const artwork = await this.findById(id);
        artworks.push(artwork);
      } catch {
        // Skip artworks that don't exist
        continue;
      }
    }
    return artworks;
  }

  private async processImages(images: string[]): Promise<string[]> {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    if (images.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed');
    }

    // TODO: Implement actual image processing
    // - Validate image URLs or upload files to S3
    // - Resize and optimize images
    // - Generate thumbnails
    // For now, just return the provided URLs

    return images.map((image, index) => {
      // Basic URL validation
      try {
        new URL(image);
        return image;
      } catch {
        throw new BadRequestException(`Invalid image URL at index ${index}`);
      }
    });
  }

  async addImages(
    artworkId: string,
    userId: string,
    newImages: string[],
  ): Promise<Artwork> {
    const artwork = await this.findById(artworkId);

    if (artwork.sellerId !== userId) {
      throw new ForbiddenException('You can only modify your own artworks');
    }

    const processedNewImages = await this.processImages(newImages);
    const allImages = [...artwork.images, ...processedNewImages];

    if (allImages.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed per artwork');
    }

    const updatedArtwork = await this.artworkRepository.update(artworkId, {
      images: allImages,
    });

    if (!updatedArtwork) {
      throw new NotFoundException('Artwork not found');
    }

    return updatedArtwork;
  }

  async removeImage(
    artworkId: string,
    userId: string,
    imageUrl: string,
  ): Promise<Artwork> {
    const artwork = await this.findById(artworkId);

    if (artwork.sellerId !== userId) {
      throw new ForbiddenException('You can only modify your own artworks');
    }

    const updatedImages = artwork.images.filter((img) => img !== imageUrl);

    if (updatedImages.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const updatedArtwork = await this.artworkRepository.update(artworkId, {
      images: updatedImages,
    });

    if (!updatedArtwork) {
      throw new NotFoundException('Artwork not found');
    }

    return updatedArtwork;
  }
}
