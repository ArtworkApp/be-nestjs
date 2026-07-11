# 🎨 Artwork Marketplace API (AWS Serverless Edition)

A comprehensive, production-ready NestJS REST API for an artwork resale marketplace platform. This API provides authentication, user management, artwork listings, and comprehensive search functionality. 

The architecture is fully optimized to run serverless on AWS using the **Serverless Framework**, **AWS Lambda**, and **Amazon Aurora Serverless (PostgreSQL)**—minimizing operational costs to \$0/month under zero traffic while supporting immediate scaling during marketing spikes.

---

## 🏗️ System Architecture Layout

The platform decouples business logic, user sessions, data processing, and heavy media assets to ensure high performance across both mobile and web clients:

```text
                      ┌───► Web App (React/Next.js) ──────┐
                      │                                   ▼
User Devices ─────────┼───► Mobile App (React/Flutter) ───┼──► [ Amazon CloudFront (CDN) ]
                      │                                   │      (Dynamic Image Handler)
                      ▼                                   │                │
               [ AWS API Gateway ]                        │                ▼
          (Throttling & Rate Limiting)                    │        [ Amazon S3 Vault ]
                      │                                   │     (High-Res Art Storage)
                      ▼                                   │                ▲
            [ AWS Lambda (NestJS) ] ──────────────────────┘                │
            (Stateless Compute Core)                                       │
                      │                                                    │
         ┌────────────┴────────────┐                                       │
         ▼                         ▼                                       │
 [ Amazon Cognito ]   [ Aurora Serverless (Postgres) ]                     │
 (Stateless JWT Auth)   (Relational Data & FTS Search) ────────────────────┘
```

### Architectural Component Specifications:
* **AWS API Gateway**: Acts as the single entry point for all platforms. It handles edge **Throttling and Rate Limiting** to drop malicious or flooding traffic before it ever touches your compute layer, saving execution budget.
* **AWS Lambda (Compute Core)**: Houses your entire NestJS application. It remains completely stateless, spinning up hundreds of concurrent micro-containers instantly during high-traffic artwork drops, and winds down to exactly zero instances when idle.
* **Amazon Cognito**: Handles user registration, verification emails, and secure logins. It issues cryptographically signed JWT tokens, allowing the NestJS Lambda core to authenticate users statelessly without running persistent session database queries.
* **Amazon Aurora Serverless v2 (PostgreSQL)**: Serves as the primary relational database. It scales database processing units up and down smoothly based on transaction load to handle users, listings, purchases, and advanced filters using optimized PostgreSQL Full-Text Search (FTS) indexes.
* **S3 Vault & CloudFront Delivery**: Media assets are fully isolated from the backend computing environment. High-resolution artwork images are uploaded via secure, short-lived **S3 Presigned URLs** straight from the client device to S3, bypassing Lambda completely. **Amazon CloudFront (CDN)** caches, compresses, and delivers optimized layout variations (WebP/AVIF formats) dynamically to end-users worldwide.

---

## ✨ Features

- **🔐 Authentication & Authorization**: JWT-based auth with email verification powered by **Amazon Cognito**.
- **👥 User Management**: Profile management, reputation system, and interactive dashboard analytics.
- **🖼️ Artwork Management**: CRUD operations with an optimized **Amazon S3 Presigned URL** file upload flow to completely bypass server compute bottlenecks.
- **🔍 Search & Discovery**: Advanced search with multi-criteria filters powered by **Amazon Aurora Serverless** PostgreSQL indexing.
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation hosted seamlessly on serverless execution contexts.
- **🧪 Comprehensive Testing**: Unit tests paired with property-based testing (`fast-check`) running inside automated pipelines.
- **🛡️ Security**: Cloud-edge infrastructure protection using **AWS API Gateway Throttling** paired with NestJS Helmet, CORS, and structural input validation.
- **📊 Monitoring**: Real-time serverless logging using **Winston** feeding natively into **Amazon CloudWatch Logs & Metrics**.

---

## 🚀 Quick Start

### Option 1: Local Development Setup (Docker & Postgres)

For fast, zero-cost development on your local machine using standard PostgreSQL:

```bash
# 1. Start local PostgreSQL development database
docker-compose up -d

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the application with hot reload
npm run start:dev
```

This will start the local API server at `http://localhost:3000` with:
- 📚 **Swagger Documentation**: http://localhost:3000/api/v1/docs
- 🌐 **API Base URL**: http://localhost:3000/api/v1

### Option 2: Serverless AWS Cloud Deployment (Production)

This project uses the **Serverless Framework** to automatically package, build, and provision your entire AWS architecture via code.

```bash
# 1. Install the Serverless Framework CLI globally
npm install -g serverless

# 2. Compile your TypeScript NestJS application
npm run build

# 3. Deploy the entire live architecture to AWS
serverless deploy --stage prod
```

---

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
- `PUT /me/profile-image` - Get S3 presigned upload URL for profile image
- `GET /search` - Search users
- `GET /:id` - Get user profile by ID
- `GET /username/:username` - Get user by username

### Artworks (`/api/v1/artworks`)
- `POST /` - Create artwork listing
- `POST /upload-url` - Request secure S3 presigned URL for direct artwork photo uploads
- `GET /search` - Search artworks with advanced relational filters
- `GET /featured` - Get featured artworks
- `GET /recent` - Get recent artworks
- `GET /categories/:category` - Get by category
- `GET /categories/stats` - Category statistics
- `GET /seller/:sellerId` - Get seller's artworks
- `GET /:id` - Get artwork details
- `PUT /:id` - Update artwork
- `DELETE /:id` - Delete artwork
- `PUT /:id/status/:status` - Update status (active, sold, inactive)

---

## 🖼️ Media Management Flow (S3 Presigned URLs)

To avoid AWS Lambda execution time limits and the 6MB payload restriction, images are **never** uploaded directly to the NestJS application server. 

```text
[Client App] ─── (1) Req Upload URL ───► [NestJS Lambda]
[Client App] ◄─── (2) Return Presigned URL ─ [NestJS Lambda]
[Client App] ─── (3) Binary PUT Upload ──────────────────────► [Amazon S3]
[Client App] ─── (4) Save S3 Asset Metadata ──► [NestJS Lambda]
```

1. The client requests an upload authorization token from `/api/v1/artworks/upload-url`.
2. NestJS communicates with the AWS SDK to generate an ephemeral, secure **S3 Presigned URL**.
3. The client uploads the binary high-resolution artwork image **directly to Amazon S3**, bypassing compute limits.
4. The client saves the final artwork metadata pointing to the S3 bucket key.

---

## 🧪 Testing the API

The project includes a comprehensive testing suite decoupled from AWS infrastructure:

```bash
# Run all unit tests
npm run test

# Run tests with coverage metrics
npm run test:cov

# Run specific property-based test files (fast-check)
npm run test -- auth.service.spec.ts
```

---

## 🔧 Environment Configuration

Key configuration parameters handled in your `.env` or injected by AWS Secret Manager:

```env
# Application Core
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1

# AWS Serverless Relational Database (Aurora/PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=securepassword
DATABASE_NAME=artwork_marketplace

# JWT Authentication
JWT_SECRET=your-secure-aws-secret-key
JWT_EXPIRES_IN=7d
```

---

## 🛠️ Project Structure

```text
src/
├── auth/              # Authentication & Cognito integrations
├── users/             # User profiles & reputation logic
├── artworks/          # Artwork catalog & S3 media handlers
├── common/            # Shared guards, interceptors, and filters
├── config/            # Serverless environment configuration mappings
├── lambda.ts          # AWS Lambda entry point wrapper
└── main.ts            # Local development machine entry point
```

---

## 📄 License

This project is licensed under the MIT License.

