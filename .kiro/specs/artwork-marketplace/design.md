# Design Document: Artwork Marketplace

## Overview

The Artwork Marketplace is a NestJS-based web application that facilitates peer-to-peer artwork transactions. The system follows a modular architecture with clear separation of concerns, implementing RESTful APIs for client communication, JWT-based authentication, and MongoDB for data persistence.

The application is structured around core business domains: User Management, Artwork Listings, Search & Discovery, Transactions, Communications, and Content Moderation. Each domain is implemented as a NestJS module with dedicated controllers, services, and data access layers.

## Technology Stack

### Backend Framework

- **NestJS**: TypeScript-based Node.js framework providing modular architecture, dependency injection, and decorators
- **Node.js**: Runtime environment for server-side JavaScript execution
- **TypeScript**: Strongly-typed superset of JavaScript for enhanced development experience

### Database & ORM

- **MongoDB**: Primary document database for data persistence
- **Redis**: In-memory data store for session management, caching, and rate limiting

### Authentication & Security

- **JWT (JSON Web Tokens)**: Stateless authentication mechanism
- **bcrypt**: Password hashing and salt generation
- **Passport.js**: Authentication middleware with JWT strategy
- **helmet**: Security middleware for HTTP headers
- **rate-limiter-flexible**: API rate limiting and DDoS protection

### File Storage & Processing

- **File Storage Service**: External object storage for artwork images and user profile pictures
- **Sharp**: High-performance image processing and optimization
- **multer**: Middleware for handling multipart/form-data file uploads

### Payment Processing

- **Stripe**: Payment gateway for secure transaction processing
- **stripe-webhook**: Webhook handling for payment status updates

### Email & Notifications

- **SendGrid**: Transactional email service for user notifications
- **nodemailer**: Email sending library with SendGrid integration
- **WebSocket (Socket.io)**: Real-time notifications and messaging

### Validation & Documentation

- **class-validator**: Decorator-based validation for DTOs
- **class-transformer**: Object transformation and serialization
- **Swagger/OpenAPI**: API documentation and testing interface
- **joi**: Schema validation for configuration and complex data structures

### Testing

- **Jest**: JavaScript testing framework for unit and integration tests
- **fast-check**: Property-based testing library for TypeScript
- **supertest**: HTTP assertion library for API endpoint testing
- **@nestjs/testing**: NestJS-specific testing utilities and mocks

### Development & Build Tools

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting and consistency
- **Husky**: Git hooks for pre-commit validation
- **Docker**: Containerization for development and deployment
- **docker-compose**: Multi-container application orchestration

### Monitoring & Logging

- **Winston**: Structured logging library
- **morgan**: HTTP request logging middleware
- **@nestjs/terminus**: Health check endpoints for monitoring
- **Sentry**: Error tracking and performance monitoring (optional)

### Environment & Configuration

- **dotenv**: Environment variable management
- **@nestjs/config**: Configuration module with validation
- **cross-env**: Cross-platform environment variable setting

## Architecture

The system follows a layered architecture pattern with the following layers:

### Presentation Layer (Controllers)

- **AuthController**: Handles user registration, login, and password reset
- **UserController**: Manages user profiles and account settings
- **ArtworkController**: Manages artwork listing CRUD operations
- **SearchController**: Handles search queries and filtering
- **TransactionController**: Processes purchase requests and payment handling
- **MessageController**: Manages user-to-user communication
- **AdminController**: Provides content moderation and platform management

### Business Logic Layer (Services)

- **AuthService**: Implements authentication logic and JWT token management
- **UserService**: Handles user profile management and reputation calculations
- **ArtworkService**: Manages artwork listing business rules and validation
- **SearchService**: Implements search algorithms and filtering logic
- **TransactionService**: Orchestrates payment processing and order fulfillment
- **MessageService**: Handles message routing and conversation management
- **NotificationService**: Manages email and in-app notifications
- **ModerationService**: Implements content filtering and safety checks

### Data Access Layer (Repositories)

- **UserRepository**: User data persistence and queries
- **ArtworkRepository**: Artwork listing data management
- **TransactionRepository**: Transaction history and payment records
- **MessageRepository**: Message storage and conversation threading
- **ReportRepository**: Content moderation and safety reports

### External Integrations

- **Payment Gateway**: Stripe or PayPal integration for secure payments
- **Email Service**: SendGrid or AWS SES for transactional emails
- **File Storage**: External object storage for artwork image storage
- **Image Processing**: Sharp or similar for image optimization

## Components and Interfaces

### Authentication Module

```typescript
interface AuthService {
  register(userData: CreateUserDto): Promise<UserEntity>;
  login(credentials: LoginDto): Promise<{ user: UserEntity; token: string }>;
  resetPassword(email: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
```

### User Management Module

```typescript
interface UserService {
  findById(id: string): Promise<UserEntity>;
  updateProfile(id: string, updates: UpdateUserDto): Promise<UserEntity>;
  calculateReputation(userId: string): Promise<number>;
  getUserDashboard(userId: string): Promise<DashboardDto>;
}

interface UserEntity {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  bio?: string;
  location?: string;
  reputation: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Artwork Management Module

```typescript
interface ArtworkService {
  createListing(
    sellerId: string,
    artworkData: CreateArtworkDto,
  ): Promise<ArtworkEntity>;
  updateListing(id: string, updates: UpdateArtworkDto): Promise<ArtworkEntity>;
  deleteListing(id: string): Promise<void>;
  findById(id: string): Promise<ArtworkEntity>;
  findBySeller(sellerId: string): Promise<ArtworkEntity[]>;
}

interface ArtworkEntity {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ArtworkCategory;
  medium: string;
  dimensions: string;
  year?: number;
  images: string[];
  sellerId: string;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### Search Module

```typescript
interface SearchService {
  searchArtworks(query: SearchQueryDto): Promise<SearchResultDto>;
  getPopularCategories(): Promise<CategoryStatsDto[]>;
  getSuggestedSearches(query: string): Promise<string[]>;
}

interface SearchQueryDto {
  q?: string;
  category?: ArtworkCategory;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  sortBy?: SortOption;
  page?: number;
  limit?: number;
}
```

### Transaction Module

```typescript
interface TransactionService {
  initiatePurchase(
    buyerId: string,
    artworkId: string,
  ): Promise<TransactionEntity>;
  processPayment(
    transactionId: string,
    paymentData: PaymentDto,
  ): Promise<TransactionEntity>;
  handlePaymentSuccess(transactionId: string): Promise<void>;
  handlePaymentFailure(transactionId: string, reason: string): Promise<void>;
}

interface TransactionEntity {
  id: string;
  artworkId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentIntentId?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

### Communication Module

```typescript
interface MessageService {
  sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    artworkId?: string,
  ): Promise<MessageEntity>;
  getConversation(
    userId: string,
    otherUserId: string,
  ): Promise<MessageEntity[]>;
  getUserConversations(userId: string): Promise<ConversationDto[]>;
  markAsRead(messageId: string, userId: string): Promise<void>;
}

interface MessageEntity {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  artworkId?: string;
  isRead: boolean;
  createdAt: Date;
}
```

## Data Models

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image TEXT,
  bio TEXT,
  location VARCHAR(255),
  reputation DECIMAL(3,2) DEFAULT 0.00,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Artworks table
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(50) NOT NULL,
  medium VARCHAR(100),
  dimensions VARCHAR(100),
  year INTEGER,
  images TEXT[] NOT NULL,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE RESTRICT,
  buyer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Enums and Types

```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

enum ArtworkCategory {
  PAINTING = 'painting',
  SCULPTURE = 'sculpture',
  PHOTOGRAPHY = 'photography',
  DIGITAL_ART = 'digital_art',
  DRAWING = 'drawing',
  MIXED_MEDIA = 'mixed_media',
  PRINT = 'print',
}

enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  INACTIVE = 'inactive',
  UNDER_REVIEW = 'under_review',
}

enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Authentication Properties

**Property 1: Valid registration creates account and sends verification**
_For any_ valid user registration data, the authentication service should create a new user account and trigger a verification email
**Validates: Requirements 1.1**

**Property 2: Duplicate email registration is rejected**
_For any_ email address that already exists in the system, registration attempts should be rejected with an appropriate error message
**Validates: Requirements 1.2**

**Property 3: Valid credentials grant access**
_For any_ verified user with correct login credentials, the authentication service should grant platform access and return a valid JWT token
**Validates: Requirements 1.3**

**Property 4: Invalid credentials deny access**
_For any_ incorrect login credentials, the authentication service should deny access and return an error message
**Validates: Requirements 1.4**

**Property 5: Password reset sends secure link**
_For any_ registered user email, password reset requests should generate and send a secure reset link
**Validates: Requirements 1.5**

### Artwork Management Properties

**Property 6: Valid artwork data creates listing**
_For any_ complete and valid artwork data, the system should create a new listing with all provided information correctly stored
**Validates: Requirements 2.1**

**Property 7: Incomplete listing data is rejected**
_For any_ artwork data missing required fields, the system should prevent listing creation and indicate the missing information
**Validates: Requirements 2.2**

**Property 8: Listing updates are saved and displayed**
_For any_ valid listing update, the system should save the changes and immediately reflect them in the public display
**Validates: Requirements 2.3**

**Property 9: Listing deletion removes from public view**
_For any_ listing deletion request, the system should remove the listing from public view and notify interested users
**Validates: Requirements 2.4**

**Property 10: Image upload validation and compression**
_For any_ uploaded artwork image, the system should validate the file format and apply compression for optimal loading
**Validates: Requirements 2.5**

### Search and Discovery Properties

**Property 11: Search returns relevant results**
_For any_ search query, the search engine should return artwork listings that are relevant to the query terms, ranked by relevance
**Validates: Requirements 3.1**

**Property 12: Filters return only matching results**
_For any_ combination of price, category, or location filters, the search engine should return only listings that match all applied filters
**Validates: Requirements 3.2**

**Property 13: Search results display required information**
_For any_ search result, the display should include artwork images, titles, prices, and seller information
**Validates: Requirements 3.4**

**Property 14: Sorting reorders results correctly**
_For any_ sort option (price or date), the search engine should reorder listings according to the selected criteria
**Validates: Requirements 3.5**

### Transaction Processing Properties

**Property 15: Purchase initiation processes securely**
_For any_ valid purchase request, the payment processor should securely collect payment information and initiate transaction processing
**Validates: Requirements 4.1**

**Property 16: Payment failure maintains listing availability**
_For any_ failed payment processing, the system should notify the buyer and keep the artwork listing available for other buyers
**Validates: Requirements 4.2**

**Property 17: Successful transaction updates status and notifies users**
_For any_ successfully completed transaction, the system should update the listing status to sold and notify both buyer and seller
**Validates: Requirements 4.3**

**Property 18: Transaction completion generates records**
_For any_ completed transaction, the system should generate a receipt and transaction record accessible to both parties
**Validates: Requirements 4.4**

**Property 19: Disputed transactions provide resolution mechanism**
_For any_ disputed transaction, the system should provide a dispute resolution process and support refund processing when appropriate
**Validates: Requirements 4.5**

### Communication Properties

**Property 20: Message delivery and storage**
_For any_ message sent about an artwork, the system should deliver it to the recipient and store the conversation history
**Validates: Requirements 5.1**

**Property 21: Message receipt triggers notifications**
_For any_ received message, the notification system should alert the recipient through their configured notification preferences
**Validates: Requirements 5.2**

**Property 22: Conversation threading and history maintenance**
_For any_ ongoing conversation between users, the system should maintain proper message threading and complete conversation history
**Validates: Requirements 5.3**

**Property 23: Inappropriate content flagging**
_For any_ message containing inappropriate content, the system should automatically flag the content for administrative review
**Validates: Requirements 5.4**

**Property 24: User blocking prevents communication**
_For any_ user blocking action, the system should prevent all further communication attempts between the blocked parties
**Validates: Requirements 5.5**

### Profile Management Properties

**Property 25: Profile updates are saved and displayed**
_For any_ valid profile information update, the system should save the changes and update the user's public profile display
**Validates: Requirements 6.1**

**Property 26: Dashboard displays user activity**
_For any_ user dashboard access, the system should display their active listings, recent transactions, and message summary
**Validates: Requirements 6.2**

**Property 27: Transaction completion enables reviews**
_For any_ completed transaction, the system should allow both parties to rate and review each other
**Validates: Requirements 6.3**

**Property 28: Reputation calculation from ratings**
_For any_ user with accumulated ratings, the system should calculate and display an accurate overall reputation score
**Validates: Requirements 6.4**

**Property 29: Policy violations trigger sanctions**
_For any_ detected policy violation, the system should apply appropriate sanctions and notify the violating user
**Validates: Requirements 6.5**

### Content Moderation Properties

**Property 30: Content reporting flags for review**
_For any_ reported inappropriate content, the system should flag the content for administrative review and investigation
**Validates: Requirements 7.1**

**Property 31: Fraud detection suspends accounts**
_For any_ detected fraudulent activity, the system should suspend involved accounts and preserve evidence for investigation
**Validates: Requirements 7.2**

**Property 32: Safety reports trigger protective measures**
_For any_ reported safety concern, the system should investigate and implement appropriate protective measures for user safety
**Validates: Requirements 7.3**

**Property 33: Policy violations result in content removal**
_For any_ content that violates platform policies, the system should remove the content and notify the user of the violation
**Validates: Requirements 7.4**

**Property 34: Repeat violations escalate enforcement**
_For any_ user with repeat policy violations, the system should escalate enforcement actions including potential account suspension
**Validates: Requirements 7.5**

### Data Security Properties

**Property 35: Personal information encryption and secure storage**
_For any_ personal information provided by users, the system should encrypt and securely store all sensitive data
**Validates: Requirements 8.1**

**Property 36: Payment information security**
_For any_ payment information processing, the system should use secure protocols and never store complete payment details
**Validates: Requirements 8.2**

**Property 37: Data deletion preserves necessary records**
_For any_ user data deletion request, the system should remove personal information while preserving necessary transaction records for legal compliance
**Validates: Requirements 8.3**

**Property 38: Security breach response**
_For any_ detected security breach, the system should immediately secure the vulnerability and notify all affected users
**Validates: Requirements 8.4**

**Property 39: Secure data access with audit logging**
_For any_ user data access attempt, the system should require secure authentication and maintain comprehensive audit logs
**Validates: Requirements 8.5**

## Error Handling

The system implements comprehensive error handling across all layers:

### API Error Responses

- **400 Bad Request**: Invalid input data or malformed requests
- **401 Unauthorized**: Missing or invalid authentication tokens
- **403 Forbidden**: Insufficient permissions for requested action
- **404 Not Found**: Requested resource does not exist
- **409 Conflict**: Resource conflicts (duplicate email, sold artwork)
- **422 Unprocessable Entity**: Valid format but business rule violations
- **500 Internal Server Error**: Unexpected system errors

### Business Logic Error Handling

- **Validation Errors**: Input validation with detailed field-level error messages
- **Authentication Failures**: Secure error messages that don't reveal system details
- **Payment Processing Errors**: Graceful handling of payment gateway failures
- **File Upload Errors**: Proper handling of invalid file formats and size limits
- **Database Errors**: Transaction rollbacks and data consistency maintenance

### External Service Error Handling

- **Payment Gateway Failures**: Retry logic and fallback payment methods
- **Email Service Failures**: Queue-based retry mechanism for notifications
- **File Storage Failures**: Backup storage options and error recovery
- **Image Processing Failures**: Fallback to original images when processing fails

## Testing Strategy

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive coverage:

### Unit Testing

Unit tests focus on specific examples, edge cases, and integration points:

- **Authentication flows**: Login, registration, password reset scenarios
- **API endpoint validation**: Request/response format verification
- **Database operations**: CRUD operations and constraint validation
- **External service integration**: Mock-based testing of payment and email services
- **Error conditions**: Specific error scenarios and edge cases

### Property-Based Testing

Property-based tests verify universal properties across randomized inputs using **fast-check** for TypeScript:

- **Minimum 100 iterations** per property test to ensure comprehensive coverage
- **Randomized test data generation** for users, artworks, transactions, and messages
- **Universal property validation** across all possible input combinations
- **Regression testing** to catch edge cases that manual testing might miss

Each property-based test references its corresponding design property:

```typescript
// Example property test structure
describe('Authentication Properties', () => {
  it(
    'should create account and send verification for valid registration data',
    {
      tag: 'Feature: artwork-marketplace, Property 1: Valid registration creates account and sends verification',
    },
    async () => {
      await fc.assert(
        fc.asyncProperty(validUserDataArbitrary(), async (userData) => {
          const result = await authService.register(userData);
          expect(result.user).toBeDefined();
          expect(emailService.sendVerification).toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    },
  );
});
```

### Integration Testing

- **End-to-end API workflows**: Complete user journeys from registration to transaction completion
- **Database integration**: Real database operations with test data cleanup
- **External service integration**: Testing with sandbox environments for payment processing
- **Cross-module interactions**: Verification of proper communication between system modules

### Performance Testing

- **Load testing**: API endpoint performance under concurrent user loads
- **Database query optimization**: Ensuring efficient queries for search and listing operations
- **Image processing performance**: Validation of image upload and compression times
- **Memory usage monitoring**: Prevention of memory leaks in long-running processes
