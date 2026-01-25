import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async exists(where: FindOptionsWhere<User>): Promise<boolean> {
    const count = await this.userRepository.count({ where });
    return count > 0;
  }

  async findAll(skip = 0, take = 10): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async updateReputation(userId: string, reputation: number): Promise<void> {
    await this.userRepository.update(userId, { reputation });
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isVerified: true,
      emailVerificationToken: null,
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }
}
