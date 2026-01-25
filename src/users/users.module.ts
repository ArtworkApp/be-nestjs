import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artwork } from '../artworks/entities/artwork.entity';
import { ArtworkRepository } from '../artworks/repositories/artwork.repository';
import { Review } from '../reviews/entities/review.entity';
import { ReviewRepository } from '../reviews/repositories/review.repository';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Review, Transaction, Artwork])],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
    ReviewRepository,
    TransactionRepository,
    ArtworkRepository,
  ],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
