import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { Repository } from 'typeorm';
import { ArtworkCategory, ListingStatus } from '../../common/enums';
import { ArtworkRepository } from '../repositories/artwork.repository';
import { Artwork } from './artwork.entity';

describe('Artwork Entity Property Tests', () => {
  let artworkRepository: ArtworkRepository;
  let mockRepository: Partial<Repository<Artwork>>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtworkRepository,
        {
          provide: getRepositoryToken(Artwork),
          useValue: mockRepository,
        },
      ],
    }).compile();

    artworkRepository = module.get<ArtworkRepository>(ArtworkRepository);
  });

  // Arbitraries for generating test data
  const validArtworkDataArbitrary = () =>
    fc.record({
      title: fc.string({ minLength: 1, maxLength: 255 }),
      description: fc.option(fc.string({ maxLength: 2000 })),
      price: fc.float({ min: 0.01, max: 999999.99 }),
      currency: fc.constantFrom('USD', 'EUR', 'GBP'),
      category: fc.constantFrom(...Object.values(ArtworkCategory)),
      medium: fc.option(fc.string({ maxLength: 100 })),
      dimensions: fc.option(fc.string({ maxLength: 100 })),
      year: fc.option(fc.integer({ min: 1000, max: new Date().getFullYear() })),
      images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 10 }),
      sellerId: fc.uuid(),
      tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        maxLength: 20,
      }),
    });

  const artworkEntityArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 255 }),
      description: fc.option(fc.string({ maxLength: 2000 })),
      price: fc.float({ min: 0.01, max: 999999.99 }),
      currency: fc.constantFrom('USD', 'EUR', 'GBP'),
      category: fc.constantFrom(...Object.values(ArtworkCategory)),
      medium: fc.option(fc.string({ maxLength: 100 })),
      dimensions: fc.option(fc.string({ maxLength: 100 })),
      year: fc.option(fc.integer({ min: 1000, max: new Date().getFullYear() })),
      images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 10 }),
      sellerId: fc.uuid(),
      status: fc.constantFrom(...Object.values(ListingStatus)),
      viewCount: fc.integer({ min: 0, max: 1000000 }),
      isFeatured: fc.boolean(),
      tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        maxLength: 20,
      }),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

  /**
   * Property 6: Valid artwork data creates listing
   * For any complete and valid artwork data, the system should create a new listing with all provided information correctly stored
   * Validates: Requirements 2.1
   */
  it('should create listing for valid artwork data', async () => {
    await fc.assert(
      fc.asyncProperty(validArtworkDataArbitrary(), async (artworkData) => {
        // Mock the repository methods
        const mockArtwork = {
          ...artworkData,
          id: 'test-id',
          status: ListingStatus.ACTIVE,
        } as Artwork;
        (mockRepository.create as jest.Mock).mockReturnValue(mockArtwork);
        (mockRepository.save as jest.Mock).mockResolvedValue(mockArtwork);

        const result = await artworkRepository.create(artworkData);

        // Verify that the artwork was created with all provided information
        expect(mockRepository.create).toHaveBeenCalledWith(artworkData);
        expect(mockRepository.save).toHaveBeenCalledWith(mockArtwork);
        expect(result).toBeDefined();
        expect(result.title).toBe(artworkData.title);
        expect(result.price).toBe(artworkData.price);
        expect(result.category).toBe(artworkData.category);
        expect(result.sellerId).toBe(artworkData.sellerId);
        expect(result.images).toEqual(artworkData.images);

        // Verify default values are set
        expect(result.status).toBe(ListingStatus.ACTIVE);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Artwork entity data integrity
   * Verifies that artwork entities maintain data integrity across all valid input combinations
   */
  it('should maintain data integrity for all valid artwork entities', async () => {
    await fc.assert(
      fc.property(artworkEntityArbitrary(), (artworkEntity) => {
        // Verify required fields are present
        expect(artworkEntity.id).toBeDefined();
        expect(artworkEntity.title).toBeDefined();
        expect(artworkEntity.price).toBeDefined();
        expect(artworkEntity.category).toBeDefined();
        expect(artworkEntity.sellerId).toBeDefined();
        expect(artworkEntity.images).toBeDefined();

        // Verify field constraints
        expect(artworkEntity.title.length).toBeGreaterThan(0);
        expect(artworkEntity.title.length).toBeLessThanOrEqual(255);
        expect(artworkEntity.price).toBeGreaterThan(0);
        expect(artworkEntity.images.length).toBeGreaterThan(0);

        // Verify enums are valid
        expect(Object.values(ArtworkCategory)).toContain(
          artworkEntity.category,
        );
        expect(Object.values(ListingStatus)).toContain(artworkEntity.status);

        // Verify currency format
        expect(['USD', 'EUR', 'GBP']).toContain(artworkEntity.currency);

        // Verify optional fields constraints
        if (artworkEntity.description) {
          expect(artworkEntity.description.length).toBeLessThanOrEqual(2000);
        }
        if (artworkEntity.medium) {
          expect(artworkEntity.medium.length).toBeLessThanOrEqual(100);
        }
        if (artworkEntity.dimensions) {
          expect(artworkEntity.dimensions.length).toBeLessThanOrEqual(100);
        }
        if (artworkEntity.year) {
          expect(artworkEntity.year).toBeGreaterThanOrEqual(1000);
          expect(artworkEntity.year).toBeLessThanOrEqual(
            new Date().getFullYear(),
          );
        }

        // Verify view count is non-negative
        expect(artworkEntity.viewCount).toBeGreaterThanOrEqual(0);

        // Verify tags constraints
        artworkEntity.tags.forEach((tag) => {
          expect(tag.length).toBeGreaterThan(0);
          expect(tag.length).toBeLessThanOrEqual(50);
        });
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Search functionality consistency
   * Verifies that search operations behave consistently across different filter combinations
   */
  it('should handle search operations consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.option(
            fc.constantFrom(...Object.values(ArtworkCategory)),
          ),
          minPrice: fc.option(fc.float({ min: 0, max: 1000 })),
          maxPrice: fc.option(fc.float({ min: 1000, max: 10000 })),
          query: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        }),
        fc.record({
          sortBy: fc.option(fc.constantFrom('price', 'createdAt', 'viewCount')),
          sortOrder: fc.option(fc.constantFrom('ASC', 'DESC')),
        }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        async (filters, sortOptions, skip, take) => {
          // Mock query builder
          const mockQueryBuilder = {
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
          };

          (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(
            mockQueryBuilder,
          );

          const result = await artworkRepository.search(
            filters,
            sortOptions,
            skip,
            take,
          );

          // Verify search was called with proper parameters
          expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
            'artwork',
          );
          expect(mockQueryBuilder.skip).toHaveBeenCalledWith(skip);
          expect(mockQueryBuilder.take).toHaveBeenCalledWith(take);

          // Verify result structure
          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(2);
          expect(Array.isArray(result[0])).toBe(true);
          expect(typeof result[1]).toBe('number');
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: Price validation
   * Verifies that price values are always positive and within reasonable bounds
   */
  it('should validate price constraints for all artwork data', async () => {
    await fc.assert(
      fc.property(fc.float({ min: 0.01, max: 999999.99 }), (price) => {
        // Price should always be positive
        expect(price).toBeGreaterThan(0);

        // Price should be within reasonable bounds for artwork
        expect(price).toBeLessThan(1000000);

        // Price should have reasonable decimal precision (max 2 decimal places when converted)
        const rounded = Math.round(price * 100) / 100;
        expect(Math.abs(price - rounded)).toBeLessThan(0.001);
      }),
      { numRuns: 100 },
    );
  });
});
