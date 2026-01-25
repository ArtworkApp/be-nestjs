import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    profileImage: null,
    bio: null,
    location: null,
    reputation: 0,
    isVerified: true,
    isActive: true,
    role: UserRole.USER,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const result = await controller.register(createUserDto);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        message: 'User registered successfully. Please check your email for verification.',
        userId: mockUser.id,
      });
    });

    it('should handle registration errors', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.register(createUserDto)).rejects.toThrow('Email already exists');
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      const authResult = {
        user: mockUser,
        accessToken: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(authResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(authResult);
    });

    it('should handle login errors', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail(token);

      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
      expect(result).toEqual({
        message: 'Email verified successfully',
      });
    });

    it('should handle invalid verification token', async () => {
      const token = 'invalid-token';
      mockAuthService.verifyEmail.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.verifyEmail(token)).rejects.toThrow('Invalid token');
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const requestDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(requestDto);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(requestDto.email);
      expect(result).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetDto: ResetPasswordDto = {
        token: 'reset-token',
        newPassword: 'newpassword123',
      };

      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetDto);
      expect(result).toEqual({
        message: 'Password reset successfully',
      });
    });

    it('should handle invalid reset token', async () => {
      const resetDto: ResetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'newpassword123',
      };

      mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.resetPassword(resetDto)).rejects.toThrow('Invalid token');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetDto);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(mockUser, changePasswordDto);

      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, changePasswordDto);
      expect(result).toEqual({
        message: 'Password changed successfully',
      });
    });

    it('should handle incorrect current password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      mockAuthService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      await expect(controller.changePassword(mockUser, changePasswordDto)).rejects.toThrow(
        'Current password is incorrect',
      );
      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, changePasswordDto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const newToken = 'new-jwt-token';
      mockAuthService.refreshToken.mockResolvedValue(newToken);

      const result = await controller.refreshToken(mockUser);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        accessToken: newToken,
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});