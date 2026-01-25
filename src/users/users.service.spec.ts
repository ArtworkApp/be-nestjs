import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ArtworkRepository } from '../artworks/repositories/artwork.repository';
import { ArtworkCategory, ListingStatus, UserRole } from '../common/enums';
import { ReviewRepository } from '../reviews/repositories/review.repository';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: UserRepository;
  let reviewRepository: ReviewRepository;
  let transactionRepository: TransactionRepository;
  let artworkRepository: ArtworkRepository;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    profileImage: null,
    bio: 'Test bio',
    location: 'Test City',
    reputation: 4.5,
    isVerified: true,
    isActive: true,
    role: UserRole.USER,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    updateReputation: jest.fn(),
    exists: jest.fn(),
  };

  const mockReviewRepository = {
    getReviewStats: jest.fn(),
    findByReviewee: jest.fn(),
  };

  const mockTransactionRepository = {
    getUserTransactionStats: jest.fn(),
    findByBuyer: jest.fn(),
    findBySeller: jest.fn(),
  };

  const mockArtworkRepository = {
    findBySeller: jest.fn(),
  };

  beforeEach(async () => {
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

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<UserRepository>(UserRepository);
    reviewRepository = module.get<ReviewRepository>(ReviewRepository);
    transactionRepository = module.get<TransactionRepository>(TransactionRepository);
    artworkRepository = module.get<ArtworkRepository>(ArtworkRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle property-based testing for findById', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          mockUserRepository.findById.mockResolvedValue({ ...mockUser, id: userId });

          const result = await service.findById(userId);

          expect(result.id).toBe(userId);
          expect(userRepository.findById).toHaveBeenCalledWith(userId);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await service.findByUsername(mockUser.username);

      expect(userRepository.findByUsername).toHaveBeenCalledWith(mockUser.username);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);

      await expect(service.findByUsername('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto: UpdateUserProfileDto = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
        location: 'New City',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result).toEqual(updatedUser);
    });

    it('should update username if not taken', async () => {
      const updateDto: UpdateUserProfileDto = {
        username: 'newusername',
      };

      const updatedUser = { ...mockUser, username: 'newusername' };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(userRepository.findByUsername).toHaveBeenCalledWith(updateDto.username);
      expect(result.username).toBe('newusername');
    });

    it('should throw ConflictException if username is already taken', async () => {
      const updateDto: UpdateUserProfileDto = {
        username: 'takenusername',
      };

      const existingUser = { ...mockUser, id: 'different-id', username: 'takenusername' };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      await expect(service.updateProfile(mockUser.id, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto: UpdateUserProfileDto = {
        firstName: 'Updated',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if update returns null', async () => {
      const updateDto: UpdateUserProfileDto = {
        firstName: 'Updated',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(null);

      await expect(service.updateProfile(mockUser.id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle property-based testing for profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            bio: fc.option(fc.string({ maxLength: 500 })),
            location: fc.option(fc.string({ maxLength: 100 })),
          }),
          async (updateData) => {
            const updatedUser = { ...mockUser, ...updateData };

            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(updatedUser);

            const result = await service.updateProfile(mockUser.id, updateData);

            expect(result.firstName).toBe(updateData.firstName);
            expect(result.lastName).toBe(updateData.lastName);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('calculateReputation', () => {
    it('should calculate reputation with reviews', async () => {
      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);

      const result = await service.calculateReputation(mockUser.id);

      expect(reviewRepository.getReviewStats).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBeCloseTo(4.5, 2);
    });

    it('should return 0 reputation if no reviews', async () => {
      const reviewStats = {
        totalReviews: 0,
        averageRating: 0,
      };

      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);

      const result = await service.calculateReputation(mockUser.id);

      expect(result).toBe(0);
    });

    it('should calculate weighted reputation based on review count', async () => {
      const reviewStats = {
        totalReviews: 5,
        averageRating: 4.0,
      };

      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);

      const result = await service.calculateReputation(mockUser.id);

      // With 5 reviews, weight should be 0.5, so: 4.0 * (0.5 + 0.5 * 0.5) = 4.0 * 0.75 = 3.0
      expect(result).toBeCloseTo(3.0, 2);
    });

    it('should handle property-based testing for reputation calculation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalReviews: fc.integer({ min: 0, max: 100 }),
            averageRating: fc.float({ min: 0, max: 5 }),
          }),
          async (reviewStats) => {
            mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);

            const result = await service.calculateReputation(mockUser.id);

            if (reviewStats.totalReviews === 0) {
              expect(result).toBe(0);
            } else {
              expect(result).toBeGreaterThanOrEqual(0);
              expect(result).toBeLessThanOrEqual(5);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('updateUserReputation', () => {
    it('should update user reputation', async () => {
      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);
      mockUserRepository.updateReputation.mockResolvedValue(undefined);

      await service.updateUserReputation(mockUser.id);

      expect(userRepository.updateReputation).toHaveBeenCalledWith(mockUser.id, 4.5);
    });
  });

  describe('getUserDashboard', () => {
    it('should get user dashboard successfully', async () => {
      const mockArtworks = [
        {
          id: 'artwork-1',
          title: 'Test Artwork',
          price: 299.99,
          category: ArtworkCategory.PAINTING,
          status: ListingStatus.ACTIVE,
        },
      ];

      const mockTransactions = [
        {
          id: 'transaction-1',
          amount: 299.99,
          status: 'completed',
        },
      ];

      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great seller!',
        },
      ];

      const transactionStats = {
        totalPurchases: 5,
        totalSales: 3,
        totalSpent: 1250.0,
        totalEarned: 890.0,
      };

      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockArtworkRepository.findBySeller.mockResolvedValue([mockArtworks, mockArtworks.length]);
      mockTransactionRepository.findByBuyer.mockResolvedValue([mockTransactions, 1]);
      mockTransactionRepository.findBySeller.mockResolvedValue([mockTransactions, 1]);
      mockTransactionRepository.getUserTransactionStats.mockResolvedValue(transactionStats);
      mockReviewRepository.findByReviewee.mockResolvedValue([mockReviews, 1]);
      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);

      const result = await service.getUserDashboard(mockUser.id);

      expect(result.user).toEqual(mockUser);
      expect(result.activeListings).toEqual(mockArtworks);
      expect(result.recentPurchases).toEqual(mockTransactions);
      expect(result.recentSales).toEqual(mockTransactions);
      expect(result.transactionStats).toEqual(transactionStats);
      expect(result.recentReviews).toEqual(mockReviews);
      expect(result.reputation).toBe(4.5);
    });

    it('should update reputation if significantly different', async () => {
      const userWithOldReputation = { ...mockUser, reputation: 2.0 };

      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      mockUserRepository.findById.mockResolvedValue(userWithOldReputation);
      mockArtworkRepository.findBySeller.mockResolvedValue([[], 0]);
      mockTransactionRepository.findByBuyer.mockResolvedValue([[], 0]);
      mockTransactionRepository.findBySeller.mockResolvedValue([[], 0]);
      mockTransactionRepository.getUserTransactionStats.mockResolvedValue({
        totalPurchases: 0,
        totalSales: 0,
        totalSpent: 0,
        totalEarned: 0,
      });
      mockReviewRepository.findByReviewee.mockResolvedValue([[], 0]);
      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);
      mockUserRepository.updateReputation.mockResolvedValue(undefined);

      const result = await service.getUserDashboard(mockUser.id);

      expect(userRepository.updateReputation).toHaveBeenCalledWith(mockUser.id, 4.5);
      expect(result.reputation).toBe(4.5);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const transactionStats = {
        totalPurchases: 5,
        totalSales: 3,
        totalSpent: 1250.0,
        totalEarned: 890.0,
      };

      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      const mockArtworks = [
        {
          id: 'artwork-1',
          title: 'Test Artwork',
          price: 299.99,
        },
      ];

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTransactionRepository.getUserTransactionStats.mockResolvedValue(transactionStats);
      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);
      mockArtworkRepository.findBySeller.mockResolvedValue([mockArtworks, 1]);

      const result = await service.getUserProfile(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(result.stats.totalSales).toBe(3);
      expect(result.stats.totalPurchases).toBe(5);
      expect(result.recentArtworks).toEqual(mockArtworks);
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics successfully', async () => {
      const transactionStats = {
        totalPurchases: 5,
        totalSales: 3,
        totalSpent: 1250.0,
        totalEarned: 890.0,
      };

      const reviewStats = {
        totalReviews: 10,
        averageRating: 4.5,
      };

      mockTransactionRepository.getUserTransactionStats.mockResolvedValue(transactionStats);
      mockReviewRepository.getReviewStats.mockResolvedValue(reviewStats);
      mockArtworkRepository.findBySeller.mockResolvedValue([[], 12]);

      const result = await service.getUserStats(mockUser.id);

      expect(result.totalListings).toBe(12);
      expect(result.totalSales).toBe(3);
      expect(result.totalPurchases).toBe(5);
      expect(result.totalEarned).toBe(890.0);
      expect(result.totalSpent).toBe(1250.0);
      expect(result.totalReviews).toBe(10);
      expect(result.averageRating).toBe(4.5);
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const mockUsers = [mockUser];
      mockUserRepository.findAll.mockResolvedValue([mockUsers, 1]);

      const result = await service.searchUsers('test', 0, 10);

      expect(userRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(result).toEqual([mockUsers, 1]);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.deactivateUser(mockUser.id);

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { isActive: false });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateUser('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.reactivateUser(mockUser.id);

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { isActive: true });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.reactivateUser('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image successfully', async () => {
      const imageUrl = 'https://example.com/profile.jpg';
      const updatedUser = { ...mockUser, profileImage: imageUrl };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.uploadProfileImage(mockUser.id, imageUrl);

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { profileImage: imageUrl });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const imageUrl = 'https://example.com/profile.jpg';
      mockUserRepository.update.mockResolvedValue(null);

      await expect(service.uploadProfileImage('nonexistent-id', imageUrl)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeProfileImage', () => {
    it('should remove profile image successfully', async () => {
      const updatedUser = { ...mockUser, profileImage: null };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.removeProfileImage(mockUser.id);

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { profileImage: null });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.update.mockResolvedValue(null);

      await expect(service.removeProfileImage('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateUserExists', () => {
    it('should return true if user exists', async () => {
      mockUserRepository.exists.mockResolvedValue(true);

      const result = await service.validateUserExists(mockUser.id);

      expect(userRepository.exists).toHaveBeenCalledWith({ id: mockUser.id });
      expect(result).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      const result = await service.validateUserExists('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('getUsersByIds', () => {
    it('should get users by IDs successfully', async () => {
      const userIds = [mockUser.id, 'another-id'];
      const anotherUser = { ...mockUser, id: 'another-id', username: 'anotheruser' };

      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(anotherUser);

      const result = await service.getUsersByIds(userIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockUser);
      expect(result[1]).toEqual(anotherUser);
    });

    it('should skip non-existent users', async () => {
      const userIds = [mockUser.id, 'nonexistent-id'];

      mockUserRepository.findById
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new NotFoundException());

      const result = await service.getUsersByIds(userIds);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUser);
    });
  });
});