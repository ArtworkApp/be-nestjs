import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'artwork_id', nullable: true })
  artworkId?: string;

  @ManyToOne(() => Artwork, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'artwork_id' })
  artwork?: Artwork;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'parent_message_id', nullable: true })
  parentMessageId?: string;

  @ManyToOne(() => Message, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage?: Message;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
