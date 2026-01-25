import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArtworkCategory, ListingStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('artworks')
export class Artwork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: ArtworkCategory })
  category: ArtworkCategory;

  @Column({ length: 100, nullable: true })
  medium?: string;

  @Column({ length: 100, nullable: true })
  dimensions?: string;

  @Column({ type: 'integer', nullable: true })
  year?: number;

  @Column({ type: 'text', array: true })
  images: string[];

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations will be added as we create other entities
  // @OneToMany(() => Transaction, transaction => transaction.artwork)
  // transactions: Transaction[];

  // @OneToMany(() => Message, message => message.artwork)
  // messages: Message[];
}
