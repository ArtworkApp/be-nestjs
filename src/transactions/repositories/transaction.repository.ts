import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TransactionStatus } from '../../common/enums';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionRepository.create(transactionData);
    return this.transactionRepository.save(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { id },
      relations: ['artwork', 'buyer', 'seller'],
    });
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { paymentIntentId },
      relations: ['artwork', 'buyer', 'seller'],
    });
  }

  async findByBuyer(
    buyerId: string,
    skip = 0,
    take = 10,
  ): Promise<[Transaction[], number]> {
    return this.transactionRepository.findAndCount({
      where: { buyerId },
      relations: ['artwork', 'seller'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(
    sellerId: string,
    skip = 0,
    take = 10,
  ): Promise<[Transaction[], number]> {
    return this.transactionRepository.findAndCount({
      where: { sellerId },
      relations: ['artwork', 'buyer'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findByArtwork(artworkId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { artworkId },
      relations: ['buyer', 'seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateData: Partial<Transaction>,
  ): Promise<Transaction | null> {
    await this.transactionRepository.update(id, updateData);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    additionalData?: Partial<Transaction>,
  ): Promise<void> {
    const updateData: Partial<Transaction> = { status, ...additionalData };

    if (status === TransactionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === TransactionStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    await this.transactionRepository.update(id, updateData);
  }

  async findByStatus(
    status: TransactionStatus,
    skip = 0,
    take = 10,
  ): Promise<[Transaction[], number]> {
    return this.transactionRepository.findAndCount({
      where: { status },
      relations: ['artwork', 'buyer', 'seller'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingTransactions(olderThanMinutes = 30): Promise<Transaction[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);

    return this.transactionRepository.find({
      where: {
        status: TransactionStatus.PENDING,
      },
      relations: ['artwork', 'buyer', 'seller'],
    });
  }

  async getUserTransactionStats(userId: string): Promise<{
    totalPurchases: number;
    totalSales: number;
    totalSpent: number;
    totalEarned: number;
  }> {
    const purchases = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .where('transaction.buyerId = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .getRawOne();

    const sales = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(transaction.sellerAmount), 0)', 'total')
      .where('transaction.sellerId = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .getRawOne();

    return {
      totalPurchases: parseInt(purchases.count, 10),
      totalSales: parseInt(sales.count, 10),
      totalSpent: parseFloat(purchases.total),
      totalEarned: parseFloat(sales.total),
    };
  }

  async exists(where: FindOptionsWhere<Transaction>): Promise<boolean> {
    const count = await this.transactionRepository.count({ where });
    return count > 0;
  }
}
