import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { TransactionStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'artwork_id' })
  artworkId: string;

  @ManyToOne(() => Artwork, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'artwork_id' })
  artwork: Artwork;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'payment_intent_id', nullable: true })
  paymentIntentId?: string;

  @Column({ name: 'stripe_charge_id', nullable: true })
  stripeChargeId?: string;

  @Column({
    name: 'platform_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  platformFee: number;

  @Column({ name: 'seller_amount', type: 'decimal', precision: 10, scale: 2 })
  sellerAmount: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  // Relations will be added as we create other entities
  // @OneToMany(() => Review, review => review.transaction)
  // reviews: Review[];
}
