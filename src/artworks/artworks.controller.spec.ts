import { Test, TestingModule } from '@nestjs/testing';
import { ArtworkCategory, ListingStatus, UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { ArtworksController } from './artworks.controller';
import { ArtworksService } from './artworks.service';
import { AddImagesDto } from './dto/add-images.dto';
import { ArtworkSearchDto } from './dto/artwork-search.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { RemoveImageDto } from './dto/remove-image.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { Artwork } from './entities/artwork.entity';

describe('ArtworksController', () => {
  let controller: ArtworksController;
  let artworksService: ArtworksService;

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

  const mockArtworksService = {
    create: jest.fn(),
    search: jest.fn(),
    getFeatured: jest.fn(),
    getRecent: jest.fn(),
    getByCategory: jest.fn(),
    getCategoryStats: jest.fn(),
    findBySeller: jest.fn(),
    findByIdAndIncrementViews: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    addImages: jest.fn(),
    removeImage: jest.fn(),
    toggleFeatured: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtworksController],
      providers: [
        {
          provide: ArtworksService,
          useValue: mockArtworksService,
        },
      ],
    }).compile();

    controller = module.get<ArtworksController>(ArtworksController);
    artworksService = module.get<ArtworksService>(ArtworksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new artwork successfully', async () => {
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

      mockArtworksService.create.mockResolvedValue(mockArtwork);

      const result = await controller.create(mockUser, createDto);

      expect(artworksService.create).toHaveBeenCalledWith(mockUser.id, createDto);
      expect(result).toEqual(mockArtwork);
    });

    it('should handle artwork creation errors', async () => {
      const createDto: CreateArtworkDto = {
        title: 'Test Artwork',
        price: 299.99,
        category: ArtworkCategory.PAINTING,
        images: ['https://example.com/image1.jpg'],
      };

      mockArtworksService.create.mockRejectedValue(new Error('Invalid artwork data'));

      await expect(controller.create(mockUser, createDto)).rejects.toThrow('Invalid artwork data');
      expect(artworksService.create).toHaveBeenCalledWith(mockUser.id, createDto);
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

      const searchResult = {
        artworks: [mockArtwork],
        total: 1,
        page: 1,
        pages: 1,
      };

      mockArtworksService.search.mockResolvedValue(searchResult);

      const result = await controller.search(searchDto);

      expect(artworksService.search).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(searchResult);
    });

    it('should handle empty search results', async () => {
      const searchDto: ArtworkSearchDto = {
        q: 'nonexistent',
      };

      const searchResult = {
        artworks: [],
        total: 0,
        page: 1,
        pages: 0,
      };

      mockArtworksService.search.mockResolvedValue(searchResult);

      const result = await controller.search(searchDto);

      expect(result.artworks).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getFeatured', () => {
    it('should get featured artworks', async () => {
      const featuredArtworks = [mockArtwork];
      mockArtworksService.getFeatured.mockResolvedValue(featuredArtworks);

      const result = await controller.getFeatured(10);

      expect(artworksService.getFeatured).toHaveBeenCalledWith(10);
      expect(result).toEqual(featuredArtworks);
    });
  });

  describe('getRecent', () => {
    it('should get recent artworks', async () => {
      const recentArtworks = [mockArtwork];
      mockArtworksService.getRecent.mockResolvedValue(recentArtworks);

      const result = await controller.getRecent(10);

      expect(artworksService.getRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual(recentArtworks);
    });
  });

  describe('getByCategory', () => {
    it('should get artworks by category', async () => {
      const categoryArtworks = [mockArtwork];
      mockArtworksService.getByCategory.mockResolvedValue(categoryArtworks);

      const result = await controller.getByCategory(ArtworkCategory.PAINTING, 10);

      expect(artworksService.getByCategory).toHaveBeenCalledWith(ArtworkCategory.PAINTING, 10);
      expect(result).toEqual(categoryArtworks);
    });
  });

  describe('getCategoryStats', () => {
    it('should get category statistics', async () => {
      const categoryStats = [
        { category: ArtworkCategory.PAINTING, count: 25 },
        { category: ArtworkCategory.SCULPTURE, count: 15 },
      ];
      mockArtworksService.getCategoryStats.mockResolvedValue(categoryStats);

      const result = await controller.getCategoryStats();

      expect(artworksService.getCategoryStats).toHaveBeenCalled();
      expect(result).toEqual(categoryStats);
    });
  });

  describe('getBySeller', () => {
    it('should get artworks by seller', async () => {
      const sellerResult = {
        artworks: [mockArtwork],
        total: 1,
        page: 1,
        pages: 1,
      };

      mockArtworksService.findBySeller.mockResolvedValue(sellerResult);

      const result = await controller.getBySeller(mockUser.id, 1, 12);

      expect(artworksService.findBySeller).toHaveBeenCalledWith(mockUser.id, 1, 12);
      expect(result).toEqual(sellerResult);
    });
  });

  describe('findById', () => {
    it('should find artwork by ID and increment views', async () => {
      mockArtworksService.findByIdAndIncrementViews.mockResolvedValue(mockArtwork);

      const result = await controller.findById(mockArtwork.id);

      expect(artworksService.findByIdAndIncrementViews).toHaveBeenCalledWith(mockArtwork.id);
      expect(result).toEqual(mockArtwork);
    });

    it('should handle artwork not found', async () => {
      mockArtworksService.findByIdAndIncrementViews.mockRejectedValue(new Error('Artwork not found'));

      await expect(controller.findById('nonexistent-id')).rejects.toThrow('Artwork not found');
    });
  });

  describe('update', () => {
    it('should update artwork successfully', async () => {
      const updateDto: UpdateArtworkDto = {
        title: 'Updated Artwork',
        price: 399.99,
      };

      const updatedArtwork = { ...mockArtwork, ...updateDto };
      mockArtworksService.update.mockResolvedValue(updatedArtwork);

      const result = await controller.update(mockArtwork.id, mockUser, updateDto);

      expect(artworksService.update).toHaveBeenCalledWith(mockArtwork.id, mockUser.id, updateDto);
      expect(result).toEqual(updatedArtwork);
    });

    it('should handle unauthorized update attempt', async () => {
      const updateDto: UpdateArtworkDto = {
        title: 'Hacked Artwork',
      };

      mockArtworksService.update.mockRejectedValue(new Error('You can only update your own artworks'));

      await expect(controller.update(mockArtwork.id, mockUser, updateDto)).rejects.toThrow(
        'You can only update your own artworks',
      );
    });
  });

  describe('delete', () => {
    it('should delete artwork successfully', async () => {
      mockArtworksService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockArtwork.id, mockUser);

      expect(artworksService.delete).toHaveBeenCalledWith(mockArtwork.id, mockUser.id);
      expect(result).toEqual({
        message: 'Artwork deleted successfully',
      });
    });

    it('should handle unauthorized delete attempt', async () => {
      mockArtworksService.delete.mockRejectedValue(new Error('You can only delete your own artworks'));

      await expect(controller.delete(mockArtwork.id, mockUser)).rejects.toThrow(
        'You can only delete your own artworks',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update artwork status successfully', async () => {
      const updatedArtwork = { ...mockArtwork, status: ListingStatus.SOLD };
      mockArtworksService.updateStatus.mockResolvedValue(updatedArtwork);

      const result = await controller.updateStatus(mockArtwork.id, ListingStatus.SOLD, mockUser);

      expect(artworksService.updateStatus).toHaveBeenCalledWith(
        mockArtwork.id,
        mockUser.id,
        ListingStatus.SOLD,
      );
      expect(result).toEqual(updatedArtwork);
    });
  });

  describe('addImages', () => {
    it('should add images to artwork successfully', async () => {
      const addImagesDto: AddImagesDto = {
        images: ['https://example.com/new-image.jpg'],
      };

      const updatedArtwork = {
        ...mockArtwork,
        images: [...mockArtwork.images, ...addImagesDto.images],
      };
      mockArtworksService.addImages.mockResolvedValue(updatedArtwork);

      const result = await controller.addImages(mockArtwork.id, mockUser, addImagesDto);

      expect(artworksService.addImages).toHaveBeenCalledWith(
        mockArtwork.id,
        mockUser.id,
        addImagesDto.images,
      );
      expect(result).toEqual(updatedArtwork);
    });
  });

  describe('removeImage', () => {
    it('should remove image from artwork successfully', async () => {
      const removeImageDto: RemoveImageDto = {
        imageUrl: 'https://example.com/image1.jpg',
      };

      const updatedArtwork = {
        ...mockArtwork,
        images: mockArtwork.images.filter(img => img !== removeImageDto.imageUrl),
      };
      mockArtworksService.removeImage.mockResolvedValue(updatedArtwork);

      const result = await controller.removeImage(mockArtwork.id, mockUser, removeImageDto);

      expect(artworksService.removeImage).toHaveBeenCalledWith(
        mockArtwork.id,
        mockUser.id,
        removeImageDto.imageUrl,
      );
      expect(result).toEqual(updatedArtwork);
    });
  });

  describe('uploadImages', () => {
    it('should upload images successfully', async () => {
      const mockFiles = [
        {
          originalname: 'image1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        },
        {
          originalname: 'image2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
        },
      ] as Express.Multer.File[];

      const updatedArtwork = {
        ...mockArtwork,
        images: [
          ...mockArtwork.images,
          `https://placeholder.com/artwork-images/${mockArtwork.id}/0-image1.jpg`,
          `https://placeholder.com/artwork-images/${mockArtwork.id}/1-image2.jpg`,
        ],
      };
      mockArtworksService.addImages.mockResolvedValue(updatedArtwork);

      const result = await controller.uploadImages(mockArtwork.id, mockUser, mockFiles);

      expect(artworksService.addImages).toHaveBeenCalledWith(
        mockArtwork.id,
        mockUser.id,
        expect.arrayContaining([
          expect.stringContaining('image1.jpg'),
          expect.stringContaining('image2.jpg'),
        ]),
      );
      expect(result).toEqual(updatedArtwork);
    });

    it('should handle no files provided', async () => {
      await expect(controller.uploadImages(mockArtwork.id, mockUser, [])).rejects.toThrow(
        'No files provided',
      );
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured status successfully', async () => {
      const updatedArtwork = { ...mockArtwork, isFeatured: true };
      mockArtworksService.toggleFeatured.mockResolvedValue(updatedArtwork);

      const result = await controller.toggleFeatured(mockArtwork.id);

      expect(artworksService.toggleFeatured).toHaveBeenCalledWith(mockArtwork.id);
      expect(result).toEqual(updatedArtwork);
    });
  });
});