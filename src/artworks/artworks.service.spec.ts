import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ArtworkCategory, ListingStatus, UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ArtworksService } from './artworks.service';
import { ArtworkSearchDto } from './dto/artwork-search.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { Artwork } from './entities/artwork.entity';
import { ArtworkRepository } from './repositories/artwork.repository';

describe('ArtworksService', () => {
  let service: ArtworksService;
  let artworkRepository: ArtworkRepository;
  let usersService: UsersService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    profileImage: null,
    bio: null,
    location: null,
    reputation: 0,
    isVerified: true,
    isActive: true,
    role: UserRole.USER,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArtwork: Artwork = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    title: 'Test Artwork',
    description: 'A beautiful test artwork',
    price: 299.99,
    currency: 'USD',
    category: ArtworkCategory.PAINTING,
    medium: 'Oil on canvas',
    dimensions: '24" x 36"',
    year: 2023,
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    sellerId: mockUser.id,
    seller: mockUser,
    status: ListingStatus.ACTIVE,
    viewCount: 0,
    isFeatured: false,
    tags: ['landscape', 'oil painting'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArtworkRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    findBySeller: jest.fn(),
    findFeatured: jest.fn(),
    findRecent: jest.fn(),
    findByCategory: jest.fn(),
    getCategoryStats: jest.fn(),
    updateStatus: jest.fn(),
    incrementViewCount: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtworksService,
        {
          provide: ArtworkRepository,
          useValue: mockArtworkRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ArtworksService>(ArtworksService);
    artworkRepository = module.get<ArtworkRepository>(ArtworkRepository);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create artwork successfully', async () => {
      const createDto: CreateArtworkDto = {
        title: 'Test Artwork',
        description: 'A beautiful test artwork',
        price: 299.99,
        currency: 'USD',
        category: ArtworkCategory.PAINTING,
        medium: 'Oil on canvas',
        dimensions: '24" x 36"',
        year: 2023,
        images: ['https://example.com/image1.jpg'],
        tags: ['landscape', 'oil painting'],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockArtworkRepository.create.mockResolvedValue(mockArtwork);

      const result = await service.create(mockUser.id, createDto);

      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(artworkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          sellerId: mockUser.id,
          status: ListingStatus.ACTIVE,
          viewCount: 0,
          isFeatured: false,
        }),
      );
      expect(result).toEqual(mockArtwork);
    });

    it('should throw BadRequestException if no images provided', async () => {
      const createDto: CreateArtworkDto = {
        title: 'Test Artwork',
        price: 299.99,
        category: ArtworkCategory.PAINTING,
        images: [],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if too many images', async () => {
      const createDto: CreateArtworkDto = {
        title: 'Test Artwork',
        price: 299.99,
        category: ArtworkCategory.PAINTING,
        images: Array(11).fill('https://example.com/image.jpg'),
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid image URLs', async () => {
      const createDto: CreateArtworkDto = {
        title: 'Test Artwork',
        price: 299.99,
        category: ArtworkCategory.PAINTING,
        images: ['invalid-url'],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle property-based testing for artwork creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            price: fc.integer({ min: 1, max: 10000 }),
            category: fc.constantFrom(...Object.values(ArtworkCategory)),
            images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          }),
          async (artworkData) => {
            mockUsersService.findById.mockResolvedValue(mockUser);
            mockArtworkRepository.create.mockResolvedValue({
              ...mockArtwork,
              ...artworkData,
            });

            const result = await service.create(mockUser.id, artworkData);

            expect(result.title).toBe(artworkData.title);
            expect(result.price).toBe(artworkData.price);
            expect(result.category).toBe(artworkData.category);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('findById', () => {
    it('should find artwork by ID successfully', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);

      const result = await service.findById(mockArtwork.id);

      expect(artworkRepository.findById).toHaveBeenCalledWith(mockArtwork.id);
      expect(result).toEqual(mockArtwork);
    });

    it('should throw NotFoundException if artwork not found', async () => {
      mockArtworkRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdAndIncrementViews', () => {
    it('should find artwork and increment views', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.incrementViewCount.mockResolvedValue(undefined);

      const result = await service.findByIdAndIncrementViews(mockArtwork.id);

      expect(artworkRepository.findById).toHaveBeenCalledWith(mockArtwork.id);
      expect(artworkRepository.incrementViewCount).toHaveBeenCalledWith(mockArtwork.id);
      expect(result).toEqual(mockArtwork);
    });

    it('should not fail if view count increment fails', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.incrementViewCount.mockRejectedValue(new Error('DB error'));

      const result = await service.findByIdAndIncrementViews(mockArtwork.id);

      expect(result).toEqual(mockArtwork);
    });
  });

  describe('update', () => {
    it('should update artwork successfully', async () => {
      const updateDto: UpdateArtworkDto = {
        title: 'Updated Artwork',
        price: 399.99,
      };

      const updatedArtwork = { ...mockArtwork, ...updateDto };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(updatedArtwork);

      const result = await service.update(mockArtwork.id, mockUser.id, updateDto);

      expect(artworkRepository.findById).toHaveBeenCalledWith(mockArtwork.id);
      expect(artworkRepository.update).toHaveBeenCalledWith(
        mockArtwork.id,
        expect.objectContaining(updateDto),
      );
      expect(result).toEqual(updatedArtwork);
    });

    it('should throw ForbiddenException if user does not own artwork', async () => {
      const updateDto: UpdateArtworkDto = {
        title: 'Hacked Artwork',
      };

      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      await expect(service.update(mockArtwork.id, mockUser.id, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if artwork not found after update', async () => {
      const updateDto: UpdateArtworkDto = {
        title: 'Updated Artwork',
      };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(null);

      await expect(service.update(mockArtwork.id, mockUser.id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should process images if provided in update', async () => {
      const updateDto: UpdateArtworkDto = {
        images: ['https://example.com/new-image.jpg'],
      };

      const updatedArtwork = { ...mockArtwork, images: updateDto.images };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(updatedArtwork);

      const result = await service.update(mockArtwork.id, mockUser.id, updateDto);

      expect(result.images).toEqual(updateDto.images);
    });
  });

  describe('delete', () => {
    it('should delete artwork successfully', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.delete.mockResolvedValue(undefined);

      await service.delete(mockArtwork.id, mockUser.id);

      expect(artworkRepository.findById).toHaveBeenCalledWith(mockArtwork.id);
      expect(artworkRepository.delete).toHaveBeenCalledWith(mockArtwork.id);
    });

    it('should throw ForbiddenException if user does not own artwork', async () => {
      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      await expect(service.delete(mockArtwork.id, mockUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('search', () => {
    it('should search artworks successfully', async () => {
      const searchDto: ArtworkSearchDto = {
        q: 'landscape',
        category: ArtworkCategory.PAINTING,
        minPrice: 100,
        maxPrice: 500,
        page: 1,
        limit: 12,
      };

      const searchResults = [mockArtwork];
      const total = 1;

      mockArtworkRepository.search.mockResolvedValue([searchResults, total]);

      const result = await service.search(searchDto);

      expect(artworkRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'landscape',
          category: ArtworkCategory.PAINTING,
          minPrice: 100,
          maxPrice: 500,
          status: ListingStatus.ACTIVE,
        }),
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        }),
        0,
        12,
      );
      expect(result).toEqual({
        artworks: searchResults,
        total,
        page: 1,
        pages: 1,
      });
    });

    it('should handle empty search results', async () => {
      const searchDto: ArtworkSearchDto = {
        q: 'nonexistent',
      };

      mockArtworkRepository.search.mockResolvedValue([[], 0]);

      const result = await service.search(searchDto);

      expect(result.artworks).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should calculate pagination correctly', async () => {
      const searchDto: ArtworkSearchDto = {
        page: 2,
        limit: 5,
      };

      mockArtworkRepository.search.mockResolvedValue([[], 23]);

      const result = await service.search(searchDto);

      expect(result.page).toBe(2);
      expect(result.pages).toBe(5); // Math.ceil(23 / 5)
    });
  });

  describe('findBySeller', () => {
    it('should find artworks by seller successfully', async () => {
      const artworks = [mockArtwork];
      const total = 1;

      mockArtworkRepository.findBySeller.mockResolvedValue([artworks, total]);

      const result = await service.findBySeller(mockUser.id, 1, 12);

      expect(artworkRepository.findBySeller).toHaveBeenCalledWith(mockUser.id, 0, 12);
      expect(result).toEqual({
        artworks,
        total,
        page: 1,
        pages: 1,
      });
    });
  });

  describe('getFeatured', () => {
    it('should get featured artworks', async () => {
      const featuredArtworks = [{ ...mockArtwork, isFeatured: true }];
      mockArtworkRepository.findFeatured.mockResolvedValue(featuredArtworks);

      const result = await service.getFeatured(10);

      expect(artworkRepository.findFeatured).toHaveBeenCalledWith(10);
      expect(result).toEqual(featuredArtworks);
    });
  });

  describe('getRecent', () => {
    it('should get recent artworks', async () => {
      const recentArtworks = [mockArtwork];
      mockArtworkRepository.findRecent.mockResolvedValue(recentArtworks);

      const result = await service.getRecent(10);

      expect(artworkRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual(recentArtworks);
    });
  });

  describe('getByCategory', () => {
    it('should get artworks by category', async () => {
      const categoryArtworks = [mockArtwork];
      mockArtworkRepository.findByCategory.mockResolvedValue(categoryArtworks);

      const result = await service.getByCategory(ArtworkCategory.PAINTING, 10);

      expect(artworkRepository.findByCategory).toHaveBeenCalledWith(ArtworkCategory.PAINTING, 10);
      expect(result).toEqual(categoryArtworks);
    });
  });

  describe('getCategoryStats', () => {
    it('should get category statistics', async () => {
      const categoryStats = [
        { category: ArtworkCategory.PAINTING, count: 25 },
        { category: ArtworkCategory.SCULPTURE, count: 15 },
      ];

      mockArtworkRepository.getCategoryStats.mockResolvedValue(categoryStats);

      const result = await service.getCategoryStats();

      expect(artworkRepository.getCategoryStats).toHaveBeenCalled();
      expect(result).toEqual(categoryStats);
    });
  });

  describe('updateStatus', () => {
    it('should update artwork status successfully', async () => {
      const updatedArtwork = { ...mockArtwork, status: ListingStatus.SOLD };

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockResolvedValueOnce(updatedArtwork);
      mockArtworkRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockArtwork.id, mockUser.id, ListingStatus.SOLD);

      expect(artworkRepository.updateStatus).toHaveBeenCalledWith(mockArtwork.id, ListingStatus.SOLD);
      expect(result).toEqual(updatedArtwork);
    });

    it('should throw ForbiddenException if user does not own artwork', async () => {
      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      await expect(
        service.updateStatus(mockArtwork.id, mockUser.id, ListingStatus.SOLD),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsSold', () => {
    it('should mark artwork as sold', async () => {
      const soldArtwork = { ...mockArtwork, status: ListingStatus.SOLD };

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockResolvedValueOnce(soldArtwork);
      mockArtworkRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.markAsSold(mockArtwork.id, mockUser.id);

      expect(artworkRepository.updateStatus).toHaveBeenCalledWith(mockArtwork.id, ListingStatus.SOLD);
      expect(result.status).toBe(ListingStatus.SOLD);
    });
  });

  describe('markAsInactive', () => {
    it('should mark artwork as inactive', async () => {
      const inactiveArtwork = { ...mockArtwork, status: ListingStatus.INACTIVE };

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockResolvedValueOnce(inactiveArtwork);
      mockArtworkRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.markAsInactive(mockArtwork.id, mockUser.id);

      expect(result.status).toBe(ListingStatus.INACTIVE);
    });
  });

  describe('reactivateListing', () => {
    it('should reactivate artwork listing', async () => {
      const activeArtwork = { ...mockArtwork, status: ListingStatus.ACTIVE };

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockResolvedValueOnce(activeArtwork);
      mockArtworkRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.reactivateListing(mockArtwork.id, mockUser.id);

      expect(result.status).toBe(ListingStatus.ACTIVE);
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured status', async () => {
      const featuredArtwork = { ...mockArtwork, isFeatured: true };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(featuredArtwork);

      const result = await service.toggleFeatured(mockArtwork.id);

      expect(artworkRepository.update).toHaveBeenCalledWith(mockArtwork.id, {
        isFeatured: true,
      });
      expect(result.isFeatured).toBe(true);
    });

    it('should throw NotFoundException if artwork not found after toggle', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(null);

      await expect(service.toggleFeatured(mockArtwork.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateOwnership', () => {
    it('should return true if user owns artwork', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);

      const result = await service.validateOwnership(mockArtwork.id, mockUser.id);

      expect(result).toBe(true);
    });

    it('should return false if user does not own artwork', async () => {
      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      const result = await service.validateOwnership(mockArtwork.id, mockUser.id);

      expect(result).toBe(false);
    });

    it('should return false if artwork not found', async () => {
      mockArtworkRepository.findById.mockRejectedValue(new NotFoundException());

      const result = await service.validateOwnership('nonexistent-id', mockUser.id);

      expect(result).toBe(false);
    });
  });

  describe('getArtworksByIds', () => {
    it('should get artworks by IDs successfully', async () => {
      const artworkIds = [mockArtwork.id, 'another-id'];
      const anotherArtwork = { ...mockArtwork, id: 'another-id', title: 'Another Artwork' };

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockResolvedValueOnce(anotherArtwork);

      const result = await service.getArtworksByIds(artworkIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockArtwork);
      expect(result[1]).toEqual(anotherArtwork);
    });

    it('should skip non-existent artworks', async () => {
      const artworkIds = [mockArtwork.id, 'nonexistent-id'];

      mockArtworkRepository.findById
        .mockResolvedValueOnce(mockArtwork)
        .mockRejectedValueOnce(new NotFoundException());

      const result = await service.getArtworksByIds(artworkIds);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockArtwork);
    });
  });

  describe('addImages', () => {
    it('should add images to artwork successfully', async () => {
      const newImages = ['https://example.com/new-image.jpg'];
      const updatedArtwork = {
        ...mockArtwork,
        images: [...mockArtwork.images, ...newImages],
      };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(updatedArtwork);

      const result = await service.addImages(mockArtwork.id, mockUser.id, newImages);

      expect(artworkRepository.update).toHaveBeenCalledWith(mockArtwork.id, {
        images: [...mockArtwork.images, ...newImages],
      });
      expect(result).toEqual(updatedArtwork);
    });

    it('should throw ForbiddenException if user does not own artwork', async () => {
      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      await expect(
        service.addImages(mockArtwork.id, mockUser.id, ['https://example.com/image.jpg']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if too many images total', async () => {
      const artworkWithManyImages = {
        ...mockArtwork,
        images: Array(9).fill('https://example.com/image.jpg'),
      };
      const newImages = ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'];

      mockArtworkRepository.findById.mockResolvedValue(artworkWithManyImages);

      await expect(service.addImages(mockArtwork.id, mockUser.id, newImages)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if artwork not found after update', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(null);

      await expect(
        service.addImages(mockArtwork.id, mockUser.id, ['https://example.com/image.jpg']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeImage', () => {
    it('should remove image from artwork successfully', async () => {
      const imageToRemove = 'https://example.com/image1.jpg';
      const updatedArtwork = {
        ...mockArtwork,
        images: mockArtwork.images.filter((img) => img !== imageToRemove),
      };

      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(updatedArtwork);

      const result = await service.removeImage(mockArtwork.id, mockUser.id, imageToRemove);

      expect(artworkRepository.update).toHaveBeenCalledWith(mockArtwork.id, {
        images: ['https://example.com/image2.jpg'],
      });
      expect(result).toEqual(updatedArtwork);
    });

    it('should throw ForbiddenException if user does not own artwork', async () => {
      const otherUserArtwork = { ...mockArtwork, sellerId: 'other-user-id' };
      mockArtworkRepository.findById.mockResolvedValue(otherUserArtwork);

      await expect(
        service.removeImage(mockArtwork.id, mockUser.id, 'https://example.com/image1.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if trying to remove last image', async () => {
      const artworkWithOneImage = {
        ...mockArtwork,
        images: ['https://example.com/only-image.jpg'],
      };

      mockArtworkRepository.findById.mockResolvedValue(artworkWithOneImage);

      await expect(
        service.removeImage(mockArtwork.id, mockUser.id, 'https://example.com/only-image.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if artwork not found after update', async () => {
      mockArtworkRepository.findById.mockResolvedValue(mockArtwork);
      mockArtworkRepository.update.mockResolvedValue(null);

      await expect(
        service.removeImage(mockArtwork.id, mockUser.id, 'https://example.com/image1.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('property-based testing for search functionality', () => {
    it('should handle various search parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 10 }),
            limit: fc.integer({ min: 1, max: 50 }),
            minPrice: fc.option(fc.float({ min: 0, max: 1000 })),
            maxPrice: fc.option(fc.float({ min: 1000, max: 10000 })),
            category: fc.option(fc.constantFrom(...Object.values(ArtworkCategory))),
          }),
          async (searchParams) => {
            mockArtworkRepository.search.mockResolvedValue([[], 0]);

            const result = await service.search(searchParams);

            expect(result.page).toBe(searchParams.page);
            expect(result.artworks).toEqual([]);
            expect(result.total).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});