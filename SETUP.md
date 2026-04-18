# Artwork Marketplace API - Setup Guide

## Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (v6 or higher)
- **Redis** (v6 or higher) - Optional for caching

## Quick Start (Development Mode)

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)

Create a `docker-compose.yml` file in the root directory:

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    container_name: artwork_mongo
    environment:
      MONGO_INITDB_DATABASE: artwork_marketplace
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: artwork_redis
    ports:
      - '6379:6379'

volumes:
  mongo_data:
```

Then run:

```bash
docker-compose up -d
```

#### Option B: Local Installation

1. Install MongoDB locally
2. Start MongoDB on your desired host/port
3. Set `MONGO_URI` to point to your database (for example `mongodb://localhost:27017/artwork_marketplace`)

### 3. Environment Configuration

The `.env` file is already configured for development. The current settings are:

- **Database**: mongodb://localhost:27017/artwork_marketplace
- **Redis**: localhost:6379 (optional)
- **Port**: 3000
- **API Prefix**: api/v1

### 4. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Or regular start
npm run start
```

The application will start on `http://localhost:3000`

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

**🚀 http://localhost:3000/api/v1/docs**

This interactive documentation includes:

- All available endpoints
- Request/response schemas
- Authentication examples
- Try-it-out functionality

## Available Endpoints

### Authentication (`/api/v1/auth`)

- `POST /register` - Register a new user
- `POST /login` - Login user
- `GET /verify-email/:token` - Verify email
- `POST /request-password-reset` - Request password reset
- `POST /reset-password` - Reset password
- `POST /change-password` - Change password (authenticated)
- `POST /refresh` - Refresh JWT token
- `GET /profile` - Get current user profile

### Users (`/api/v1/users`)

- `GET /me/dashboard` - Get user dashboard
- `GET /me/stats` - Get user statistics
- `PUT /me/profile` - Update profile
- `PUT /me/profile-image` - Upload profile image
- `DELETE /me/profile-image` - Remove profile image
- `GET /search` - Search users
- `GET /:id` - Get user profile by ID
- `GET /username/:username` - Get user by username

### Artworks (`/api/v1/artworks`)

- `POST /` - Create artwork listing
- `GET /search` - Search artworks
- `GET /featured` - Get featured artworks
- `GET /recent` - Get recent artworks
- `GET /categories/:category` - Get artworks by category
- `GET /categories/stats` - Get category statistics
- `GET /seller/:sellerId` - Get artworks by seller
- `GET /:id` - Get artwork by ID
- `PUT /:id` - Update artwork
- `DELETE /:id` - Delete artwork
- `PUT /:id/status/:status` - Update artwork status

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response for authenticated requests.

### 3. Create an Artwork

```bash
curl -X POST http://localhost:3000/api/v1/artworks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Beautiful Landscape",
    "description": "A stunning landscape painting",
    "price": 299.99,
    "currency": "USD",
    "category": "PAINTING",
    "medium": "Oil on canvas",
    "dimensions": "24\" x 36\"",
    "year": 2023,
    "images": ["https://example.com/image1.jpg"],
    "tags": ["landscape", "nature"]
  }'
```

## Development Scripts

```bash
# Start in development mode with hot reload
npm run start:dev

# Build the application
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run linting
npm run lint

# Format code
npm run format
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure `MONGO_URI`
3. Set a secure JWT secret
4. Configure external services (Redis, etc.)
5. Build the application: `npm run build`
6. Start with: `npm run start:prod`

## Troubleshooting

### Database Connection Issues

- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify the database host and port are reachable

### Port Already in Use

- Change the `PORT` in `.env` file
- Or kill the process using the port: `lsof -ti:3000 | xargs kill -9`

### Redis Connection (Optional)

- Redis is optional for development
- If you don't have Redis, the app will still work without caching

## Next Steps

1. **Database Schema**: Define and implement MongoDB schema models
2. **File Upload**: Configure a file storage service for image storage
3. **Email Service**: Configure SendGrid or similar for email notifications
4. **Payment Processing**: Integrate Stripe for transactions
5. **Rate Limiting**: Configure Redis for rate limiting in production

Happy coding! 🎨
