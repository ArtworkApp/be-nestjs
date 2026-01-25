import { ApiProperty } from '@nestjs/swagger';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../entities/user.entity';

export class UserDashboardDto {
  @ApiProperty({
    description: 'User information',
    type: () => User,
  })
  user: User;

  @ApiProperty({
    description: 'User active artwork listings',
    type: [Artwork],
  })
  activeListings: Artwork[];

  @ApiProperty({
    description: 'Recent purchases made by the user',
    type: [Transaction],
  })
  recentPurchases: Transaction[];

  @ApiProperty({
    description: 'Recent sales made by the user',
    type: [Transaction],
  })
  recentSales: Transaction[];

  @ApiProperty({
    description: 'Transaction statistics',
    example: {
      totalPurchases: 5,
      totalSales: 3,
      totalSpent: 1250.0,
      totalEarned: 890.0,
    },
  })
  transactionStats: {
    totalPurchases: number;
    totalSales: number;
    totalSpent: number;
    totalEarned: number;
  };

  @ApiProperty({
    description: 'Recent reviews received by the user',
    type: [Review],
  })
  recentReviews: Review[];

  @ApiProperty({
    description: 'Current user reputation score',
    example: 4.5,
  })
  reputation: number;
}
