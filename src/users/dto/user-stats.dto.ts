import { ApiProperty } from '@nestjs/swagger';

export class UserStatsDto {
  @ApiProperty({
    description: 'Total number of artwork listings',
    example: 12,
  })
  totalListings: number;

  @ApiProperty({
    description: 'Total number of completed sales',
    example: 8,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Total number of purchases made',
    example: 5,
  })
  totalPurchases: number;

  @ApiProperty({
    description: 'Total amount earned from sales',
    example: 2400.0,
  })
  totalEarned: number;

  @ApiProperty({
    description: 'Total amount spent on purchases',
    example: 1250.0,
  })
  totalSpent: number;

  @ApiProperty({
    description: 'Total number of reviews received',
    example: 15,
  })
  totalReviews: number;

  @ApiProperty({
    description: 'Average rating from reviews',
    example: 4.5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Current reputation score',
    example: 4.5,
  })
  reputation: number;
}
