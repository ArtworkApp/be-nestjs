import { ApiProperty } from '@nestjs/swagger';
import { Artwork } from '../../artworks/entities/artwork.entity';

export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'Profile image URL',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profileImage?: string;

  @ApiProperty({
    description: 'User bio',
    example: 'Art enthusiast and collector',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'User location',
    example: 'New York, NY',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'User reputation score',
    example: 4.5,
  })
  reputation: number;

  @ApiProperty({
    description: 'Whether the user is verified',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'User registration date',
    example: '2023-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User statistics',
    example: {
      totalListings: 12,
      totalSales: 8,
      totalPurchases: 5,
      totalEarned: 2400.0,
      totalSpent: 1250.0,
      totalReviews: 15,
      averageRating: 4.5,
    },
  })
  stats: {
    totalListings: number;
    totalSales: number;
    totalPurchases: number;
    totalEarned: number;
    totalSpent: number;
    totalReviews: number;
    averageRating: number;
  };

  @ApiProperty({
    description: 'Recent artworks by the user',
    type: [Artwork],
  })
  recentArtworks: Artwork[];
}
