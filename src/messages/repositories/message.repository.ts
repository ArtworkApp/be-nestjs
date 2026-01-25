import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

export interface ConversationSummary {
  otherUserId: string;
  otherUserUsername: string;
  otherUserProfileImage?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  artworkId?: string;
  artworkTitle?: string;
}

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async create(messageData: Partial<Message>): Promise<Message> {
    const message = this.messageRepository.create(messageData);
    return this.messageRepository.save(message);
  }

  async findById(id: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'recipient', 'artwork'],
    });
  }

  async findConversation(
    userId1: string,
    userId2: string,
    artworkId?: string,
    skip = 0,
    take = 50,
  ): Promise<[Message[], number]> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('message.artwork', 'artwork')
      .where(
        '((message.senderId = :userId1 AND message.recipientId = :userId2) OR (message.senderId = :userId2 AND message.recipientId = :userId1))',
        { userId1, userId2 },
      );

    if (artworkId) {
      queryBuilder.andWhere('message.artworkId = :artworkId', { artworkId });
    }

    queryBuilder.orderBy('message.createdAt', 'DESC').skip(skip).take(take);

    return queryBuilder.getManyAndCount();
  }

  async getUserConversations(userId: string): Promise<ConversationSummary[]> {
    // This is a complex query that gets the latest message for each conversation
    const conversations = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'CASE WHEN message.senderId = :userId THEN message.recipientId ELSE message.senderId END as "otherUserId"',
        'message.artworkId as "artworkId"',
        'MAX(message.createdAt) as "lastMessageAt"',
      ])
      .where('(message.senderId = :userId OR message.recipientId = :userId)', {
        userId,
      })
      .groupBy(
        'CASE WHEN message.senderId = :userId THEN message.recipientId ELSE message.senderId END',
      )
      .addGroupBy('message.artworkId')
      .orderBy('"lastMessageAt"', 'DESC')
      .getRawMany();

    // Get detailed information for each conversation
    const conversationDetails = await Promise.all(
      conversations.map(async (conv) => {
        // Get the latest message
        const latestMessage = await this.messageRepository
          .createQueryBuilder('message')
          .leftJoinAndSelect('message.sender', 'sender')
          .leftJoinAndSelect('message.recipient', 'recipient')
          .leftJoinAndSelect('message.artwork', 'artwork')
          .where(
            '((message.senderId = :userId AND message.recipientId = :otherUserId) OR (message.senderId = :otherUserId AND message.recipientId = :userId))',
            { userId, otherUserId: conv.otherUserId },
          )
          .andWhere(
            conv.artworkId
              ? 'message.artworkId = :artworkId'
              : 'message.artworkId IS NULL',
            {
              artworkId: conv.artworkId,
            },
          )
          .orderBy('message.createdAt', 'DESC')
          .getOne();

        // Get unread count
        const unreadCount = await this.messageRepository.count({
          where: {
            senderId: conv.otherUserId,
            recipientId: userId,
            isRead: false,
            ...(conv.artworkId
              ? { artworkId: conv.artworkId }
              : { artworkId: null }),
          },
        });

        // Get other user info
        const otherUser =
          latestMessage?.sender.id === userId
            ? latestMessage.recipient
            : latestMessage?.sender;

        return {
          otherUserId: conv.otherUserId,
          otherUserUsername: otherUser?.username || 'Unknown User',
          otherUserProfileImage: otherUser?.profileImage,
          lastMessage: latestMessage?.content || '',
          lastMessageAt: new Date(conv.lastMessageAt),
          unreadCount,
          artworkId: conv.artworkId,
          artworkTitle: latestMessage?.artwork?.title,
        };
      }),
    );

    return conversationDetails;
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      { id: messageId, recipientId: userId },
      { isRead: true },
    );
  }

  async markConversationAsRead(
    senderId: string,
    recipientId: string,
    artworkId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      senderId,
      recipientId,
      isRead: false,
    };

    if (artworkId) {
      whereCondition.artworkId = artworkId;
    }

    await this.messageRepository.update(whereCondition, { isRead: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async findByArtwork(
    artworkId: string,
    skip = 0,
    take = 20,
  ): Promise<[Message[], number]> {
    return this.messageRepository.findAndCount({
      where: { artworkId },
      relations: ['sender', 'recipient'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async flagMessage(messageId: string): Promise<void> {
    await this.messageRepository.update(messageId, { isFlagged: true });
  }

  async findFlaggedMessages(skip = 0, take = 20): Promise<[Message[], number]> {
    return this.messageRepository.findAndCount({
      where: { isFlagged: true },
      relations: ['sender', 'recipient', 'artwork'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.messageRepository.delete(id);
  }

  async exists(where: FindOptionsWhere<Message>): Promise<boolean> {
    const count = await this.messageRepository.count({ where });
    return count > 0;
  }
}
