# 🎨 Artwork Marketplace API

A comprehensive NestJS-based REST API for an artwork resale marketplace platform. This API provides authentication, user management, artwork listings, and comprehensive search functionality.

## ✨ Features

- **🔐 Authentication & Authorization**: JWT-based auth with email verification
- **👥 User Management**: Profile management, reputation system, dashboard
- **🖼️ Artwork Management**: CRUD operations, image upload, categorization
- **🔍 Search & Discovery**: Advanced search with filters, featured listings
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation
- **🧪 Comprehensive Testing**: Unit tests with property-based testing
- **🛡️ Security**: Helmet, CORS, rate limiting, input validation
- **📊 Monitoring**: Health checks, logging with Winston

## 🚀 Quick Start

### Option 1: Demo Mode (No External Dependencies)

The fastest way to try the API:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start in demo mode
node demo-start.js
```

This will start the API at `http://localhost:3000` with:

- 📚 **Swagger Documentation**: http://localhost:3000/api/v1/docs
- 🌐 **API Base URL**: http://localhost:3000/api/v1

### Option 2: Full Development Setup

For full functionality with MongoDB and Redis:

```bash
# 1. Start database services (requires Docker)
docker-compose up -d

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the application
npm run start:dev

# Or use the convenience script
./start-dev.sh    # Linux/Mac
start-dev.bat     # Windows
```

## 📖 API Documentation

Once running, visit the interactive Swagger documentation:

**🔗 http://localhost:3000/api/v1/docs**

The documentation includes:

- All available endpoints with examples
- Request/response schemas
- Authentication examples
- Try-it-out functionality
- Model definitions

## 🔑 API Endpoints Overview

### Authentication (`/api/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `GET /verify-email/:token` - Verify email
- `POST /request-password-reset` - Request password reset
- `POST /reset-password` - Reset password
- `POST /change-password` - Change password (auth required)
- `POST /refresh` - Refresh JWT token
- `GET /profile` - Get current user profile

### Users (`/api/v1/users`)

- `GET /me/dashboard` - User dashboard with stats
- `GET /me/stats` - User statistics
- `PUT /me/profile` - Update profile
- `PUT /me/profile-image` - Upload profile image
- `GET /search` - Search users
- `GET /:id` - Get user profile by ID
- `GET /username/:username` - Get user by username

### Artworks (`/api/v1/artworks`)

- `POST /` - Create artwork listing
- `GET /search` - Search artworks with filters
- `GET /featured` - Get featured artworks
- `GET /recent` - Get recent artworks
- `GET /categories/:category` - Get by category
- `GET /categories/stats` - Category statistics
- `GET /seller/:sellerId` - Get seller's artworks
- `GET /:id` - Get artwork details
- `PUT /:id` - Update artwork
- `DELETE /:id` - Delete artwork
- `PUT /:id/status/:status` - Update status

## 🧪 Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "username": "artist123",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Artist"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "artist@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `accessToken` from the response.

### 3. Create an Artwork

```bash
curl -X POST http://localhost:3000/api/v1/artworks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Sunset Over Mountains",
    "description": "A beautiful landscape painting capturing the golden hour",
    "price": 450.00,
    "currency": "USD",
    "category": "PAINTING",
    "medium": "Oil on canvas",
    "dimensions": "30\" x 40\"",
    "year": 2023,
    "images": ["https://example.com/artwork1.jpg"],
    "tags": ["landscape", "sunset", "mountains"]
  }'
```

### 4. Search Artworks

```bash
curl "http://localhost:3000/api/v1/artworks/search?q=landscape&category=PAINTING&minPrice=100&maxPrice=1000"
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugging

# Building
npm run build          # Build the application
npm run start:prod     # Start production build

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Project Structure

```
src/
├── auth/              # Authentication module
├── users/             # User management module
├── artworks/          # Artwork management module
├── common/            # Shared utilities and enums
├── config/            # Configuration files
└── main.ts           # Application entry point
```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: 101+ tests covering all services and controllers
- **Property-Based Testing**: Using fast-check for robust validation
- **Integration Tests**: End-to-end API testing
- **Test Coverage**: Detailed coverage reports

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:cov

# Run specific test file
npm run test -- auth.service.spec.ts
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Application
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1

# Database (MongoDB)
MONGO_URI=mongodb://localhost:27017/artwork_marketplace

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Optional Services
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Database Setup

#### Using Docker (Recommended)

```bash
# Start MongoDB and Redis
docker-compose up -d

# Check status
docker-compose ps
```

#### Manual Setup

1. Install MongoDB
2. Start MongoDB and ensure the `artwork_marketplace` database is reachable via `MONGO_URI`

## 🚀 Production Deployment

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure secure JWT secret
3. Set up production database
4. Configure external services (Redis, etc.)
5. Set up reverse proxy (nginx)
6. Configure SSL/TLS

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

## 📊 API Features

### Authentication & Security

- JWT-based authentication
- Email verification
- Password reset functionality
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers

### User Management

- User profiles with reputation system
- Dashboard with statistics
- Profile image upload
- Account management

### Artwork Management

- CRUD operations for artwork listings
- Image upload and management
- Category-based organization
- Status management (active, sold, inactive)
- View tracking

### Search & Discovery

- Advanced search with multiple filters
- Category-based browsing
- Featured artwork system
- Recent listings
- Seller-specific listings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- 📖 Check the [API Documentation](http://localhost:3000/api/v1/docs)
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

---

**Happy coding! 🎨✨**
