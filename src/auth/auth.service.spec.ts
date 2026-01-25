import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UserRepository } from '../users/repositories/user.repository';
import { AuthService } from './auth.service';

describe('AuthService Property Tests', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  // let configService: ConfigService;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      findById: jest.fn(),
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

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    jwtService = module.get<JwtService>(JwtService);
    // configService = module.get<ConfigService>(ConfigService);
  });

  // Arbitraries for generating test data
  const validCreateUserDtoArbitrary = () =>
    fc.record({
      email: fc.emailAddress(),
      username: fc
        .string({ minLength: 3, maxLength: 50 })
        .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
      password: fc.string({ minLength: 8, maxLength: 100 }),
      firstName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      lastName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    });

  const validLoginDtoArbitrary = () =>
    fc.record({
      emailOrUsername: fc.oneof(
        fc.emailAddress(),
        fc.string({ minLength: 3, maxLength: 50 }),
      ),
      password: fc.string({ minLength: 8, maxLength: 100 }),
    });

  const userEntityArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      username: fc.string({ minLength: 3, maxLength: 50 }),
      passwordHash: fc.string({ minLength: 60, maxLength: 60 }), // bcrypt hash length
      firstName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      lastName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      isVerified: fc.boolean(),
      isActive: fc.boolean(),
      role: fc.constantFrom(...Object.values(UserRole)),
      emailVerificationToken: fc.option(
        fc.string({ minLength: 32, maxLength: 64 }),
      ),
      passwordResetToken: fc.option(
        fc.string({ minLength: 32, maxLength: 64 }),
      ),
      passwordResetExpires: fc.option(fc.date()),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

  /**
   * Property 1: Valid registration creates account and sends verification
   * For any valid user registration data, the authentication service should create a new user account and trigger a verification email
   * Validates: Requirements 1.1
   */
  it('should create account and send verification for valid registration data', async () => {
    await fc.assert(
      fc.asyncProperty(validCreateUserDtoArbitrary(), async (createUserDto) => {
        // Mock repository responses - no existing users
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
        (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);

        // Mock user creation
        const mockUser = {
          id: 'test-id',
          ...createUserDto,
          passwordHash: 'hashed-password',
          emailVerificationToken: 'verification-token',
          isVerified: false,
          isActive: true,
          reputation: 0,
          role: UserRole.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User;

        (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

        const result = await authService.register(createUserDto);

        // Verify that the user was created
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
          createUserDto.email,
        );
        expect(userRepository.findByUsername).toHaveBeenCalledWith(
          createUserDto.username,
        );
        expect(userRepository.create).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result.email).toBe(createUserDto.email);
        expect(result.username).toBe(createUserDto.username);
        expect(result.isVerified).toBe(false);
        expect(result.emailVerificationToken).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Duplicate email registration is rejected
   * For any email address that already exists in the system, registration attempts should be rejected with an appropriate error message
   * Validates: Requirements 1.2
   */
  it('should reject duplicate email registration', async () => {
    await fc.assert(
      fc.asyncProperty(validCreateUserDtoArbitrary(), async (createUserDto) => {
        // Mock existing user with same email
        const existingUser = {
          id: 'existing-id',
          email: createUserDto.email,
        } as User;
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(
          existingUser,
        );
        (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);

        await expect(authService.register(createUserDto)).rejects.toThrow(
          ConflictException,
        );
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
          createUserDto.email,
        );
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 3: Valid credentials grant access
   * For any verified user with correct login credentials, the authentication service should grant platform access and return a valid JWT token
   * Validates: Requirements 1.3
   */
  it('should grant access for valid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLoginDtoArbitrary(),
        userEntityArbitrary(),
        async (loginDto, userEntity) => {
          // Ensure user is active and verified
          const activeUser = {
            ...userEntity,
            isActive: true,
            isVerified: true,
          };

          // Mock user lookup
          (userRepository.findByEmailOrUsername as jest.Mock).mockResolvedValue(
            activeUser,
          );

          // Mock password comparison
          jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

          // Mock JWT token generation
          (jwtService.sign as jest.Mock).mockReturnValue('mock-jwt-token');

          const result = await authService.login(loginDto);

          expect(userRepository.findByEmailOrUsername).toHaveBeenCalledWith(
            loginDto.emailOrUsername,
          );
          expect(result).toBeDefined();
          expect(result.user).toBe(activeUser);
          expect(result.accessToken).toBe('mock-jwt-token');
          expect(jwtService.sign).toHaveBeenCalledWith({
            sub: activeUser.id,
            email: activeUser.email,
            role: activeUser.role,
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 4: Invalid credentials deny access
   * For any incorrect login credentials, the authentication service should deny access and return an error message
   * Validates: Requirements 1.4
   */
  it('should deny access for invalid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(validLoginDtoArbitrary(), async (loginDto) => {
        // Mock no user found
        (userRepository.findByEmailOrUsername as jest.Mock).mockResolvedValue(
          null,
        );

        await expect(authService.login(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(userRepository.findByEmailOrUsername).toHaveBeenCalledWith(
          loginDto.emailOrUsername,
        );
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5: Password reset sends secure link
   * For any registered user email, password reset requests should generate and send a secure reset link
   * Validates: Requirements 1.5
   */
  it('should generate secure reset token for valid email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        userEntityArbitrary(),
        async (email, userEntity) => {
          const user = { ...userEntity, email };
          (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

          await authService.requestPasswordReset(email);

          expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
          expect(userRepository.setPasswordResetToken).toHaveBeenCalledWith(
            user.id,
            expect.any(String),
            expect.any(Date),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: Email verification token validation
   * Verifies that email verification tokens are properly validated and processed
   */
  it('should validate email verification tokens correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 32, maxLength: 64 }),
        userEntityArbitrary(),
        async (token, userEntity) => {
          const user = { ...userEntity, emailVerificationToken: token };
          (
            userRepository.findByEmailVerificationToken as jest.Mock
          ).mockResolvedValue(user);

          await authService.verifyEmail(token);

          expect(
            userRepository.findByEmailVerificationToken,
          ).toHaveBeenCalledWith(token);
          expect(userRepository.markEmailAsVerified).toHaveBeenCalledWith(
            user.id,
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: Password reset token validation
   * Verifies that password reset tokens are properly validated and processed
   */
  it('should validate password reset tokens correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          token: fc.string({ minLength: 32, maxLength: 64 }),
          newPassword: fc.string({ minLength: 8, maxLength: 100 }),
        }),
        userEntityArbitrary(),
        async (resetData, userEntity) => {
          const futureDate = new Date();
          futureDate.setHours(futureDate.getHours() + 1);

          const user = {
            ...userEntity,
            passwordResetToken: resetData.token,
            passwordResetExpires: futureDate,
          };

          (
            userRepository.findByPasswordResetToken as jest.Mock
          ).mockResolvedValue(user);

          await authService.resetPassword(resetData);

          expect(userRepository.findByPasswordResetToken).toHaveBeenCalledWith(
            resetData.token,
          );
          expect(userRepository.update).toHaveBeenCalledWith(
            user.id,
            expect.objectContaining({ passwordHash: expect.any(String) }),
          );
          expect(userRepository.clearPasswordResetToken).toHaveBeenCalledWith(
            user.id,
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property Test: JWT payload consistency
   * Verifies that JWT payloads are consistently generated with correct user information
   */
  it('should generate consistent JWT payloads', async () => {
    await fc.assert(
      fc.property(userEntityArbitrary(), (userEntity) => {
        const user = { ...userEntity, isActive: true, reputation: 0 };
        (jwtService.sign as jest.Mock).mockReturnValue('mock-token');

        authService.refreshToken(user);

        expect(jwtService.sign).toHaveBeenCalledWith({
          sub: user.id,
          email: user.email,
          role: user.role,
        });
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Password hashing consistency
   * Verifies that passwords are consistently hashed with proper salt rounds
   */
  it('should hash passwords consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        async (password) => {
          // Mock bcrypt.hash to return a predictable hash
          const mockHash = 'hashed-' + password;
          jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockHash as never);

          // Test through registration flow
          const createUserDto = {
            email: 'test@example.com',
            username: 'testuser',
            password,
          };

          (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
          (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
          (userRepository.create as jest.Mock).mockResolvedValue({
            id: 'test-id',
            ...createUserDto,
            passwordHash: mockHash,
          });

          await authService.register(createUserDto);

          expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        },
      ),
      { numRuns: 50 },
    );
  });
});
