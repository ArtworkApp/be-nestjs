import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Review } from '../entities/review.entity';

@Injectable()
export class ReviewRepository {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(reviewData: Partial<Review>): Promise<Review> {
    const review = this.reviewRepository.create(reviewData);
    return this.reviewRepository.save(review);
  }

  async findById(id: string): Promise<Review | null> {
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['transaction', 'reviewer', 'reviewee'],
    });
  }

  async findByTransaction(transactionId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { transactionId },
      relations: ['reviewer', 'reviewee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByReviewee(
    revieweeId: string,
    skip = 0,
    take = 10,
  ): Promise<[Review[], number]> {
    return this.reviewRepository.findAndCount({
      where: { revieweeId, isPublic: true },
      relations: ['reviewer', 'transaction'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findByReviewer(
    reviewerId: string,
    skip = 0,
    take = 10,
  ): Promise<[Review[], number]> {
    return this.reviewRepository.findAndCount({
      where: { reviewerId },
      relations: ['reviewee', 'transaction'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async calculateAverageRating(revieweeId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.revieweeId = :revieweeId', { revieweeId })
      .andWhere('review.isPublic = :isPublic', { isPublic: true })
      .getRawOne();

    return parseFloat(result.average) || 0;
  }

  async getRatingDistribution(
    revieweeId: string,
  ): Promise<{ rating: number; count: number }[]> {
    return this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.revieweeId = :revieweeId', { revieweeId })
      .andWhere('review.isPublic = :isPublic', { isPublic: true })
      .groupBy('review.rating')
      .orderBy('review.rating', 'DESC')
      .getRawMany();
  }

  async hasUserReviewedTransaction(
    reviewerId: string,
    transactionId: string,
  ): Promise<boolean> {
    const count = await this.reviewRepository.count({
      where: { reviewerId, transactionId },
    });
    return count > 0;
  }

  async update(
    id: string,
    updateData: Partial<Review>,
  ): Promise<Review | null> {
    await this.reviewRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.reviewRepository.delete(id);
  }

  async getReviewStats(revieweeId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { rating: number; count: number }[];
  }> {
    const totalReviews = await this.reviewRepository.count({
      where: { revieweeId, isPublic: true },
    });

    const averageRating = await this.calculateAverageRating(revieweeId);
    const ratingDistribution = await this.getRatingDistribution(revieweeId);

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
    };
  }

  async exists(where: FindOptionsWhere<Review>): Promise<boolean> {
    const count = await this.reviewRepository.count({ where });
    return count > 0;
  }
}
