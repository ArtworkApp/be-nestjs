import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArtworkRepository } from '../artworks/repositories/artwork.repository';
import { ReviewRepository } from '../reviews/repositories/review.repository';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserDashboardDto } from './dto/user-dashboard.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly artworkRepository: ArtworkRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (
      updateUserProfileDto.username &&
      updateUserProfileDto.username !== user.username
    ) {
      const existingUser = await this.userRepository.findByUsername(
        updateUserProfileDto.username,
      );
      if (existingUser) {
        throw new ConflictException('Username is already taken');
      }
    }

    const updatedUser = await this.userRepository.update(
      userId,
      updateUserProfileDto,
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async calculateReputation(userId: string): Promise<number> {
    const reviewStats = await this.reviewRepository.getReviewStats(userId);

    if (reviewStats.totalReviews === 0) {
      return 0;
    }

    // Calculate weighted reputation based on number of reviews and average rating
    // More reviews = more reliable reputation
    const baseReputation = reviewStats.averageRating;
    const reviewCountWeight = Math.min(reviewStats.totalReviews / 10, 1); // Max weight at 10+ reviews
    const weightedReputation = baseReputation * (0.5 + 0.5 * reviewCountWeight);

    // Round to 2 decimal places
    return Math.round(weightedReputation * 100) / 100;
  }

  async updateUserReputation(userId: string): Promise<void> {
    const reputation = await this.calculateReputation(userId);
    await this.userRepository.updateReputation(userId, reputation);
  }

  async getUserDashboard(userId: string): Promise<UserDashboardDto> {
    const user = await this.findById(userId);

    // Get user's active listings
    const [activeListings] = await this.artworkRepository.findBySeller(
      userId,
      0,
      5,
    );

    // Get recent transactions (both purchases and sales)
    const [recentPurchases] = await this.transactionRepository.findByBuyer(
      userId,
      0,
      5,
    );
    const [recentSales] = await this.transactionRepository.findBySeller(
      userId,
      0,
      5,
    );

    // Get transaction statistics
    const transactionStats =
      await this.transactionRepository.getUserTransactionStats(userId);

    // Get recent reviews received
    const [recentReviews] = await this.reviewRepository.findByReviewee(
      userId,
      0,
      5,
    );

    // Calculate reputation if needed
    const currentReputation = await this.calculateReputation(userId);
    if (Math.abs(user.reputation - currentReputation) > 0.01) {
      await this.updateUserReputation(userId);
      user.reputation = currentReputation;
    }

    return {
      user,
      activeListings,
      recentPurchases,
      recentSales,
      transactionStats,
      recentReviews,
      reputation: currentReputation,
    };
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);

    // Get user statistics
    const transactionStats =
      await this.transactionRepository.getUserTransactionStats(userId);
    const reviewStats = await this.reviewRepository.getReviewStats(userId);

    // Get recent artworks
    const [recentArtworks] = await this.artworkRepository.findBySeller(
      userId,
      0,
      6,
    );

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      bio: user.bio,
      location: user.location,
      reputation: user.reputation,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      stats: {
        totalListings: transactionStats.totalSales + recentArtworks.length,
        totalSales: transactionStats.totalSales,
        totalPurchases: transactionStats.totalPurchases,
        totalEarned: transactionStats.totalEarned,
        totalSpent: transactionStats.totalSpent,
        totalReviews: reviewStats.totalReviews,
        averageRating: reviewStats.averageRating,
      },
      recentArtworks,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const transactionStats =
      await this.transactionRepository.getUserTransactionStats(userId);
    const reviewStats = await this.reviewRepository.getReviewStats(userId);

    // Get artwork statistics
    const [, totalListings] = await this.artworkRepository.findBySeller(
      userId,
      0,
      1,
    );

    return {
      totalListings,
      totalSales: transactionStats.totalSales,
      totalPurchases: transactionStats.totalPurchases,
      totalEarned: transactionStats.totalEarned,
      totalSpent: transactionStats.totalSpent,
      totalReviews: reviewStats.totalReviews,
      averageRating: reviewStats.averageRating,
      reputation: await this.calculateReputation(userId),
    };
  }

  async searchUsers(
    query: string,
    skip = 0,
    take = 10,
  ): Promise<[User[], number]> {
    // This is a simple implementation - in production you might want more sophisticated search
    return this.userRepository.findAll(skip, take);
  }

  async deactivateUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, { isActive: false });
  }

  async reactivateUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, { isActive: true });
  }

  async uploadProfileImage(userId: string, imageUrl: string): Promise<User> {
    const updatedUser = await this.userRepository.update(userId, {
      profileImage: imageUrl,
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async removeProfileImage(userId: string): Promise<User> {
    const updatedUser = await this.userRepository.update(userId, {
      profileImage: null,
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async validateUserExists(userId: string): Promise<boolean> {
    return this.userRepository.exists({ id: userId });
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    const users: User[] = [];
    for (const id of userIds) {
      try {
        const user = await this.findById(id);
        users.push(user);
      } catch {
        // Skip users that don't exist
        continue;
      }
    }
    return users;
  }
}
