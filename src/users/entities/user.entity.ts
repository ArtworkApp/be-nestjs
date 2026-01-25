import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName?: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ length: 255, nullable: true })
  location?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  reputation: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ name: 'email_verification_token', nullable: true })
  @Exclude()
  emailVerificationToken?: string;

  @Column({ name: 'password_reset_token', nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @Column({ name: 'password_reset_expires', nullable: true })
  @Exclude()
  passwordResetExpires?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations will be added as we create other entities
  // @OneToMany(() => Artwork, artwork => artwork.seller)
  // artworks: Artwork[];

  // @OneToMany(() => Transaction, transaction => transaction.buyer)
  // purchases: Transaction[];

  // @OneToMany(() => Transaction, transaction => transaction.seller)
  // sales: Transaction[];

  // @OneToMany(() => Message, message => message.sender)
  // sentMessages: Message[];

  // @OneToMany(() => Message, message => message.recipient)
  // receivedMessages: Message[];

  // @OneToMany(() => Review, review => review.reviewer)
  // givenReviews: Review[];

  // @OneToMany(() => Review, review => review.reviewee)
  // receivedReviews: Review[];
}
