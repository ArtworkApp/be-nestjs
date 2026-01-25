import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserDashboardDto } from './dto/user-dashboard.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

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

  const mockUsersService = {
    getUserDashboard: jest.fn(),
    getUserStats: jest.fn(),
    updateProfile: jest.fn(),
    uploadProfileImage: jest.fn(),
    removeProfileImage: jest.fn(),
    searchUsers: jest.fn(),
    getUserProfile: jest.fn(),
    findByUsername: jest.fn(),
    deactivateUser: jest.fn(),
    reactivateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return user dashboard', async () => {
      const mockDashboard: UserDashboardDto = {
        user: mockUser,
        activeListings: [],
        recentPurchases: [],
        recentSales: [],
        transactionStats: {
          totalPurchases: 5,
          totalSales: 3,
          totalSpent: 1250.0,
          totalEarned: 890.0,
        },
        recentReviews: [],
        reputation: 4.5,
      };

      mockUsersService.getUserDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard(mockUser);

      expect(usersService.getUserDashboard).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('getMyStats', () => {
    it('should return user statistics', async () => {
      const mockStats: UserStatsDto = {
        totalListings: 12,
        totalSales: 8,
        totalPurchases: 5,
        totalEarned: 2400.0,
        totalSpent: 1250.0,
        totalReviews: 15,
        averageRating: 4.5,
        reputation: 4.5,
      };

      mockUsersService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getMyStats(mockUser);

      expect(usersService.getUserStats).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockStats);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto: UpdateUserProfileDto = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result).toEqual(updatedUser);
    });

    it('should handle profile update errors', async () => {
      const updateDto: UpdateUserProfileDto = {
        username: 'taken-username',
      };

      mockUsersService.updateProfile.mockRejectedValue(new Error('Username already taken'));

      await expect(controller.updateProfile(mockUser, updateDto)).rejects.toThrow(
        'Username already taken',
      );
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image successfully', async () => {
      const mockFile = {
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const updatedUser = { ...mockUser, profileImage: 'https://example.com/profile.jpg' };
      mockUsersService.uploadProfileImage.mockResolvedValue(updatedUser);

      const result = await controller.uploadProfileImage(mockUser, mockFile);

      expect(usersService.uploadProfileImage).toHaveBeenCalledWith(
        mockUser.id,
        expect.stringContaining('profile.jpg'),
      );
      expect(result).toEqual(updatedUser);
    });

    it('should handle missing file', async () => {
      await expect(controller.uploadProfileImage(mockUser, undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeProfileImage', () => {
    it('should remove profile image successfully', async () => {
      const updatedUser = { ...mockUser, profileImage: null };
      mockUsersService.removeProfileImage.mockResolvedValue(updatedUser);

      const result = await controller.removeProfileImage(mockUser);

      expect(usersService.removeProfileImage).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const mockUsers = [mockUser];
      const mockTotal = 1;
      mockUsersService.searchUsers.mockResolvedValue([mockUsers, mockTotal]);

      const result = await controller.searchUsers('test', 1, 10);

      expect(usersService.searchUsers).toHaveBeenCalledWith('test', 0, 10);
      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: mockTotal,
          pages: 1,
        },
      });
    });

    it('should handle empty search results', async () => {
      mockUsersService.searchUsers.mockResolvedValue([[], 0]);

      const result = await controller.searchUsers('nonexistent', 1, 10);

      expect(result.users).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile by ID', async () => {
      const mockProfile: UserProfileDto = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profileImage: mockUser.profileImage,
        bio: mockUser.bio,
        location: mockUser.location,
        reputation: mockUser.reputation,
        isVerified: mockUser.isVerified,
        createdAt: mockUser.createdAt,
        stats: {
          totalListings: 12,
          totalSales: 8,
          totalPurchases: 5,
          totalEarned: 2400.0,
          totalSpent: 1250.0,
          totalReviews: 15,
          averageRating: 4.5,
        },
        recentArtworks: [],
      };

      mockUsersService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getUserProfile(mockUser.id);

      expect(usersService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics by ID', async () => {
      const mockStats: UserStatsDto = {
        totalListings: 12,
        totalSales: 8,
        totalPurchases: 5,
        totalEarned: 2400.0,
        totalSpent: 1250.0,
        totalReviews: 15,
        averageRating: 4.5,
        reputation: 4.5,
      };

      mockUsersService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats(mockUser.id);

      expect(usersService.getUserStats).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getUserByUsername', () => {
    it('should get user profile by username', async () => {
      const mockProfile: UserProfileDto = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profileImage: mockUser.profileImage,
        bio: mockUser.bio,
        location: mockUser.location,
        reputation: mockUser.reputation,
        isVerified: mockUser.isVerified,
        createdAt: mockUser.createdAt,
        stats: {
          totalListings: 12,
          totalSales: 8,
          totalPurchases: 5,
          totalEarned: 2400.0,
          totalSpent: 1250.0,
          totalReviews: 15,
          averageRating: 4.5,
        },
        recentArtworks: [],
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getUserByUsername(mockUser.username);

      expect(usersService.findByUsername).toHaveBeenCalledWith(mockUser.username);
      expect(usersService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      mockUsersService.deactivateUser.mockResolvedValue(undefined);

      const result = await controller.deactivateAccount(mockUser);

      expect(usersService.deactivateUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        message: 'Account deactivated successfully',
      });
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate user account', async () => {
      mockUsersService.reactivateUser.mockResolvedValue(undefined);

      const result = await controller.reactivateAccount(mockUser);

      expect(usersService.reactivateUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        message: 'Account reactivated successfully',
      });
    });
  });
});