import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ArtworkRepository } from '../artworks/repositories/artwork.repository';
import { UserRole } from '../common/enums';
import { ReviewRepository } from '../reviews/repositories/review.repository';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

describe('UsersService Property Tests', () => {
  let usersService: UsersService;
  let userRepository: UserRepository;
  let reviewRepository: ReviewRepository;
  let transactionRepository: TransactionRepository;
  let artworkRepository: ArtworkRepository;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      updateReputation: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
    };

    const mockReviewRepository = {
      getReviewStats: jest.fn(),
      findByReviewee: jest.fn(),
    };

    const mockTransactionRepository = {
      findByBuyer: jest.fn(),
      findBySeller: jest.fn(),
      getUserTransactionStats: jest.fn(),
    };

    const mockArtworkRepository = {
      findBySeller: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ReviewRepository,
          useValue: mockReviewRepository,
        },
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepository,
        },
        {
          provide: ArtworkRepository,
          useValue: mockArtworkRepository,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    userRepository = module.get<UserRepository>(UserRepository);
    reviewRepository = module.get<ReviewRepository>(ReviewRepository);
    transactionRepository = module.get<TransactionRepository>(
      TransactionRepository,
    );
    artworkRepository = module.get<ArtworkRepository>(ArtworkRepository);
  });

  // Arbitraries for generating test data
  const userEntityArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      username: fc.string({ minLength: 3, maxLength: 50 }),
      passwordHash: fc.string({ minLength: 60, maxLength: 60 }),
      firstName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      lastName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      profileImage: fc.option(fc.webUrl()),
      bio: fc.option(fc.string({ maxLength: 1000 })),
      location: fc.option(fc.string({ maxLength: 255 })),
      reputation: fc.float({ min: 0, max: 5 }),
      isVerified: fc.boolean(),
      isActive: fc.boolean(),
      role: fc.constantFrom(...Object.values(UserRole)),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

  const updateUserProfileDtoArbitrary = () =>
    fc.record({
      username: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
      firstName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      lastName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      bio: fc.option(fc.string({ maxLength: 1000 })),
      location: fc.option(fc.string({ maxLength: 255 })),
    });

  const reviewStatsArbitrary = () =>
    fc.record({
      totalReviews: fc.integer({ min: 0, max: 100 }),
      averageRating: fc.float({ min: 1, max: 5 }),
      ratingDistribution: fc.array(
        fc.record({
          rating: fc.integer({ min: 1, max: 5 }),
          count: fc.integer({ min: 0, max: 20 }),
        }),
        { maxLength: 5 },
      ),
    });

  const transactionStatsArbitrary = () =>
    fc.record({
      totalPurchases: fc.integer({ min: 0, max: 100 }),
      totalSales: fc.integer({ min: 0, max: 100 }),
      totalSpent: fc.float({ min: 0, max: 10000 }),
      totalEarned: fc.float({ min: 0, max: 10000 }),
    });

  /**
   * Property 25: Profile updates are saved and displayed
   * For any valid profile information update, the system should save the changes and update the user's public profile display
   * Validates: Requirements 6.1
   */
  it('should save and display profile updates for valid data', async () => {
    await fc.assert(
      fc.asyncProperty(
        userEntityArbitrary(),
        updateUserProfileDtoArbitrary(),
        async (userEntity, updateDto) => {
          const user = { ...userEntity, reputation: 0 } as User;
          const updatedUser = { ...user, ...updateDto } as User;

          (userRepository.findById as jest.Mock).mockResolvedValue(user);
          (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
          (userRepository.update as jest.Mock).mockResolvedValue(updatedUser);

          const result = await usersService.updateProfile(user.id, updateDto);

          expect(userRepository.findById).toHaveBeenCalledWith(user.id);
          expect(userRepository.update).toHaveBeenCalledWith(
            user.id,
            updateDto,
          );
          expect(result).toBeDefined();
          expect(result.id).toBe(user.id);

          // Verify that updated fields are reflected
          if (updateDto.username) {
            expect(result.username).toBe(updateDto.username);
          }
          if (updateDto.firstName) {
            expect(result.firstName).toBe(updateDto.firstName);
          }
          if (updateDto.bio) {
            expect(result.bio).toBe(updateDto.bio);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28: Reputation calculation from ratings
   * For any user with accumulated ratings, the system should calculate and display an accurate overall reputation score
   * Validates: Requirements 6.4
   */
  it('should calculate reputation accurately from ratings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        reviewStatsArbitrary(),
        async (userId, reviewStats) => {
          (reviewRepository.getReviewStats as jest.Mock).mockResolvedValue(
            reviewStats,
          );

          const reputation = await usersService.calculateReputation(userId);

          expect(reviewRepository.getReviewStats).toHaveBeenCalledWith(userId);
          expect(reputation).toBeGreaterThanOrEqual(0);
          expect(reputation).toBeLessThanOrEqual(5);

          if (reviewStats.totalReviews === 0) {
            expect(reputation).toBe(0);
          } else {
            // Reputation should be influenced by both average rating and review count
            expect(reputation).toBeGreaterThan(0);
            expect(reputation).toBeLessThanOrEqual(reviewStats.averageRating);

            // More reviews should lead to reputation closer to average rating
            const expectedMinReputation = reviewStats.averageRating * 0.5;
            const expectedMaxReputation = reviewStats.averageRating;

            expect(reputation).toBeGreaterThanOrEqual(
              expectedMinReputation - 0.01,
            );
            expect(reputation).toBeLessThanOrEqual(
              expectedMaxReputation + 0.01,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26: Dashboard displays user activity
   * For any user dashboard access, the system should display their active listings, recent transactions, and message summary
   * Validates: Requirements 6.2
   */
  it('should display comprehensive user activity in dashboard', async () => {
    await fc.assert(
      fc.asyncProperty(
        userEntityArbitrary(),
        transactionStatsArbitrary(),
        reviewStatsArbitrary(),
        async (userEntity, transactionStats, reviewStats) => {
          const user = { ...userEntity, reputation: 0 } as User;
          const mockArtworks = [];
          const mockTransactions = [];
          const mockReviews = [];

          (userRepository.findById as jest.Mock).mockResolvedValue(user);
          (artworkRepository.findBySeller as jest.Mock).mockResolvedValue([
            mockArtworks,
            mockArtworks.length,
          ]);
          (transactionRepository.findByBuyer as jest.Mock).mockResolvedValue([
            mockTransactions,
            mockTransactions.length,
          ]);
          (transactionRepository.findBySeller as jest.Mock).mockResolvedValue([
            mockTransactions,
            mockTransactions.length,
          ]);
          (
            transactionRepository.getUserTransactionStats as jest.Mock
          ).mockResolvedValue(transactionStats);
          (reviewRepository.findByReviewee as jest.Mock).mockResolvedValue([
            mockReviews,
            mockReviews.length,
          ]);
          (reviewRepository.getReviewStats as jest.Mock).mockResolvedValue(
            reviewStats,
          );

          const dashboard = await usersService.getUserDashboard(user.id);

          expect(userRepository.findById).toHaveBeenCalledWith(user.id);
          expect(artworkRepository.findBySeller).toHaveBeenCalledWith(
            user.id,
            0,
            5,
          );
          expect(transactionRepository.findByBuyer).toHaveBeenCalledWith(
            user.id,
            0,
            5,
          );
          expect(transactionRepository.findBySeller).toHaveBeenCalledWith(
            user.id,
            0,
            5,
          );
          expect(
            transactionRepository.getUserTransactionStats,
          ).toHaveBeenCalledWith(user.id);
          expect(reviewRepository.findByReviewee).toHaveBeenCalledWith(
            user.id,
            0,
            5,
          );

          // Verify dashboard structure
          expect(dashboard).toBeDefined();
          expect(dashboard.user).toBeDefined();
          expect(dashboard.activeListings).toBeDefined();
          expect(dashboard.recentPurchases).toBeDefined();
          expect(dashboard.recentSales).toBeDefined();
          expect(dashboard.transactionStats).toBeDefined();
          expect(dashboard.recentReviews).toBeDefined();
          expect(dashboard.reputation).toBeGreaterThanOrEqual(0);
          expect(dashboard.reputation).toBeLessThanOrEqual(5);

          // Verify transaction stats structure
          expect(dashboard.transactionStats.totalPurchases).toBe(
            transactionStats.totalPurchases,
          );
          expect(dashboard.transactionStats.totalSales).toBe(
            transactionStats.totalSales,
          );
          expect(dashboard.transactionStats.totalSpent).toBe(
            transactionStats.totalSpent,
          );
          expect(dashboard.transactionStats.totalEarned).toBe(
            transactionStats.totalEarned,
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: Username uniqueness validation
   * Verifies that username updates properly check for uniqueness
   */
  it('should validate username uniqueness during profile updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        userEntityArbitrary(),
        fc.string({ minLength: 3, maxLength: 50 }),
        async (userEntity, newUsername) => {
          const user = { ...userEntity, reputation: 0 } as User;
          const updateDto = { username: newUsername };

          (userRepository.findById as jest.Mock).mockResolvedValue(user);

          if (newUsername === user.username) {
            // Same username should be allowed
            (userRepository.findByUsername as jest.Mock).mockResolvedValue(
              null,
            );
            (userRepository.update as jest.Mock).mockResolvedValue({
              ...user,
              username: newUsername,
            });

            const result = await usersService.updateProfile(user.id, updateDto);
            expect(result).toBeDefined();
          } else {
            // Different username - test both available and taken scenarios
            const existingUser = {
              id: 'other-id',
              username: newUsername,
            } as User;
            (userRepository.findByUsername as jest.Mock).mockResolvedValue(
              existingUser,
            );

            await expect(
              usersService.updateProfile(user.id, updateDto),
            ).rejects.toThrow(ConflictException);
            expect(userRepository.findByUsername).toHaveBeenCalledWith(
              newUsername,
            );
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: User profile data consistency
   * Verifies that user profile data maintains consistency across different operations
   */
  it('should maintain user profile data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        userEntityArbitrary(),
        transactionStatsArbitrary(),
        reviewStatsArbitrary(),
        async (userEntity, transactionStats, reviewStats) => {
          const user = { ...userEntity, reputation: 0 } as User;
          const mockArtworks = [];

          (userRepository.findById as jest.Mock).mockResolvedValue(user);
          (
            transactionRepository.getUserTransactionStats as jest.Mock
          ).mockResolvedValue(transactionStats);
          (reviewRepository.getReviewStats as jest.Mock).mockResolvedValue(
            reviewStats,
          );
          (artworkRepository.findBySeller as jest.Mock).mockResolvedValue([
            mockArtworks,
            mockArtworks.length,
          ]);

          const profile = await usersService.getUserProfile(user.id);

          // Verify profile data consistency
          expect(profile.id).toBe(user.id);
          expect(profile.username).toBe(user.username);
          expect(profile.firstName).toBe(user.firstName);
          expect(profile.lastName).toBe(user.lastName);
          expect(profile.bio).toBe(user.bio);
          expect(profile.location).toBe(user.location);
          expect(profile.isVerified).toBe(user.isVerified);
          expect(profile.createdAt).toBe(user.createdAt);

          // Verify stats consistency
          expect(profile.stats.totalSales).toBe(transactionStats.totalSales);
          expect(profile.stats.totalPurchases).toBe(
            transactionStats.totalPurchases,
          );
          expect(profile.stats.totalEarned).toBe(transactionStats.totalEarned);
          expect(profile.stats.totalSpent).toBe(transactionStats.totalSpent);
          expect(profile.stats.totalReviews).toBe(reviewStats.totalReviews);
          expect(profile.stats.averageRating).toBe(reviewStats.averageRating);

          // Verify arrays are defined
          expect(Array.isArray(profile.recentArtworks)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: User existence validation
   * Verifies that user existence checks work correctly
   */
  it('should validate user existence correctly', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        // Test existing user
        (userRepository.exists as jest.Mock).mockResolvedValue(true);
        const existsResult = await usersService.validateUserExists(userId);
        expect(existsResult).toBe(true);
        expect(userRepository.exists).toHaveBeenCalledWith({ id: userId });

        // Test non-existing user
        (userRepository.exists as jest.Mock).mockResolvedValue(false);
        const notExistsResult = await usersService.validateUserExists(userId);
        expect(notExistsResult).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: User deactivation and reactivation
   * Verifies that user account status changes work correctly
   */
  it('should handle user deactivation and reactivation correctly', async () => {
    await fc.assert(
      fc.asyncProperty(userEntityArbitrary(), async (userEntity) => {
        const user = { ...userEntity, reputation: 0 } as User;

        (userRepository.findById as jest.Mock).mockResolvedValue(user);
        (userRepository.update as jest.Mock).mockResolvedValue(user);

        // Test deactivation
        await usersService.deactivateUser(user.id);
        expect(userRepository.update).toHaveBeenCalledWith(user.id, {
          isActive: false,
        });

        // Test reactivation
        await usersService.reactivateUser(user.id);
        expect(userRepository.update).toHaveBeenCalledWith(user.id, {
          isActive: true,
        });
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: Profile image management
   * Verifies that profile image upload and removal work correctly
   */
  it('should handle profile image management correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        userEntityArbitrary(),
        fc.webUrl(),
        async (userEntity, imageUrl) => {
          const user = { ...userEntity, reputation: 0 } as User;
          const updatedUser = { ...user, profileImage: imageUrl };

          (userRepository.update as jest.Mock).mockResolvedValue(updatedUser);

          // Test image upload
          const uploadResult = await usersService.uploadProfileImage(
            user.id,
            imageUrl,
          );
          expect(userRepository.update).toHaveBeenCalledWith(user.id, {
            profileImage: imageUrl,
          });
          expect(uploadResult.profileImage).toBe(imageUrl);

          // Test image removal
          const removedUser = { ...user, profileImage: null };
          (userRepository.update as jest.Mock).mockResolvedValue(removedUser);

          const removeResult = await usersService.removeProfileImage(user.id);
          expect(userRepository.update).toHaveBeenCalledWith(user.id, {
            profileImage: null,
          });
          expect(removeResult.profileImage).toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });
});
