import {
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fc from 'fast-check';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UserRepository } from '../users/repositories/user.repository';
import { AuthService, JwtPayload } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    profileImage: null,
    bio: null,
    location: null,
    reputation: 0,
    isVerified: true,
    isActive: true,
    role: UserRole.USER,
    emailVerificationToken: 'verification-token',
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findByEmailOrUsername: jest.fn(),
    findById: jest.fn(),
    findByEmailVerificationToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    markEmailAsVerified: jest.fn(),
    setPasswordResetToken: jest.fn(),
    clearPasswordResetToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      jest.spyOn(crypto, 'randomBytes').mockReturnValue('token' as any);

      const result = await service.register(createUserDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(createUserDto.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          username: createUserDto.username,
          passwordHash: 'hashedpassword',
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          emailVerificationToken: expect.any(String),
          isVerified: false,
          isActive: true,
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
    });

    it('should throw ConflictException if username already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        username: 'existinguser',
        password: 'password123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(createUserDto.username);
    });

    it('should handle property-based testing for user registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (userData) => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockUserRepository.findByUsername.mockResolvedValue(null);
            mockUserRepository.create.mockResolvedValue({ ...mockUser, ...userData });

            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
            jest.spyOn(crypto, 'randomBytes').mockReturnValue('token' as any);

            const result = await service.register(userData);

            expect(result).toBeDefined();
            expect(result.email).toBe(userData.email);
            expect(result.username).toBe(userData.username);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with email', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(userRepository.findByEmailOrUsername).toHaveBeenCalledWith(loginDto.emailOrUsername);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'jwt-token',
      });
    });

    it('should login user successfully with username', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'testuser',
        password: 'password123',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('jwt-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmailOrUsername.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      mockUserRepository.findByEmailVerificationToken.mockResolvedValue(mockUser);
      mockUserRepository.markEmailAsVerified.mockResolvedValue(undefined);

      await service.verifyEmail(token);

      expect(userRepository.findByEmailVerificationToken).toHaveBeenCalledWith(token);
      expect(userRepository.markEmailAsVerified).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException if token is invalid', async () => {
      const token = 'invalid-token';
      mockUserRepository.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const email = 'test@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.setPasswordResetToken.mockResolvedValue(undefined);

      jest.spyOn(crypto, 'randomBytes').mockReturnValue('resettoken' as any);

      await service.requestPasswordReset(email);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.setPasswordResetToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
      );
    });

    it('should not throw error if user does not exist (security)', async () => {
      const email = 'nonexistent@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.requestPasswordReset(email)).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset-token',
        newPassword: 'newpassword123',
      };

      const userWithResetToken = {
        ...mockUser,
        passwordResetToken: 'reset-token',
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockUserRepository.findByPasswordResetToken.mockResolvedValue(userWithResetToken);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockUserRepository.clearPasswordResetToken.mockResolvedValue(undefined);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);

      await service.resetPassword(resetPasswordDto);

      expect(userRepository.findByPasswordResetToken).toHaveBeenCalledWith(resetPasswordDto.token);
      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.newPassword, 12);
      expect(userRepository.update).toHaveBeenCalledWith(userWithResetToken.id, {
        passwordHash: 'newhashedpassword',
      });
      expect(userRepository.clearPasswordResetToken).toHaveBeenCalledWith(userWithResetToken.id);
    });

    it('should throw BadRequestException if token is invalid', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'newpassword123',
      };

      mockUserRepository.findByPasswordResetToken.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'expired-token',
        newPassword: 'newpassword123',
      };

      const userWithExpiredToken = {
        ...mockUser,
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 3600000), // 1 hour ago
      };

      mockUserRepository.findByPasswordResetToken.mockResolvedValue(userWithExpiredToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = mockUser.id;
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.changePassword(userId, changePasswordDto);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.passwordHash,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 12);
      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        passwordHash: 'newhashedpassword',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent-id';
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const userId = mockUser.id;
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      const payload: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(userRepository.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload: JwtPayload = {
        sub: 'nonexistent-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const payload: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(service.validateUser(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toBe('new-jwt-token');
    });

    it('should handle property-based testing for token refresh', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom(UserRole.USER, UserRole.ADMIN),
          }),
          async (userData) => {
            const testUser = { ...mockUser, ...userData };
            mockJwtService.sign.mockReturnValue('test-token');

            const result = await service.refreshToken(testUser);

            expect(result).toBe('test-token');
            expect(jwtService.sign).toHaveBeenCalledWith({
              sub: testUser.id,
              email: testUser.email,
              role: testUser.role,
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});