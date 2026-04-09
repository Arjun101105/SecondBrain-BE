# Second Brain Backend - Express.js API

A complete Express.js backend port of the Next.js API, providing REST endpoints for the Second Brain application.

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ 
- **MongoDB** (local or cloud instance)
- **Cloudinary** account (for file uploads)

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.local .env.local
# Edit .env.local with your actual values

# Start development server
npm run dev
```

The server will start on `http://localhost:5000`

## 📦 Environment Variables

Required variables in `.env.local`:

```
# Server
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/secondBrain

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-here-12345
JWT_EXPIRATION=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# App
APP_URL=http://localhost:5000
```

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /signup` - Register new user
- `POST /signin` - Login user

### Content (`/api/v1/content`)
- `GET /` - List user's content (with pagination, filtering)
- `POST /` - Create new content
- `GET /:id` - Get specific content
- `PATCH /:id` - Update content
- `DELETE /:id` - Delete content
- `POST /upload` - Upload file to Cloudinary
- `GET /search/:query` - Search content by title, description, tags

### Collections (`/api/v1/collections`)
- `GET /` - List all collections
- `POST /` - Create new collection
- `GET /:id` - Get collection with content
- `PATCH /:id` - Update collection
- `DELETE /:id` - Delete collection
- `POST /:id/content` - Add content to collection
- `DELETE /:id/content/:contentId` - Remove content from collection

### Users (`/api/v1/users`)
- `GET /:id` - Get user public profile
- `PATCH /:id` - Update own profile
- `POST /:id/follow` - Follow user
- `DELETE /:id/follow` - Unfollow user

### Brain Sharing (`/api/v1/brain`)
- `POST /share` - Create share link
- `GET /share` - Get current user's share link
- `DELETE /share` - Delete share link
- `GET /:hash` - Access shared brain (public endpoint)

## 🗂️ Project Structure

```
src/
├── app.ts                 # Express app initialization
├── server.ts              # Entry point
├── config/
│   └── database.ts        # MongoDB connection
├── models/                # Mongoose schemas
│   ├── User.ts
│   ├── Content.ts
│   ├── Collection.ts
│   ├── UserProfile.ts
│   └── SharedLink.ts
├── middleware/
│   ├── auth.ts           # JWT verification
│   ├── validators.ts     # Input validation
│   ├── rateLimit.ts      # Rate limiting
│   └── errorHandler.ts   # Global error handler
├── routes/               # API routes
│   ├── auth.ts
│   ├── content.ts
│   ├── collections.ts
│   ├── users.ts
│   └── brain.ts
├── utils/
│   └── cloudinary.ts     # File upload utilities
└── types/
    └── index.ts          # TypeScript interfaces
```

## 🔧 Available Scripts

```bash
npm run dev       # Start development server with ts-node
npm run build     # Compile TypeScript to JavaScript
npm start         # Run compiled JavaScript
```

## 🗄️ Database Setup

### Local MongoDB
```bash
# On macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Create database (automatic on first write)
# Default connection: mongodb://localhost:27017/secondBrain
```

### MongoDB Atlas (Cloud)
1. Create free cluster at [mongodb.com](https://mongodb.com)
2. Get connection string
3. Update `MONGODB_URI` in `.env.local`

## 📤 File Upload Setup

### Cloudinary Configuration
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Update `.env.local` with your credentials

File upload limit: **50MB**

## 🔐 Authentication

Uses JWT (JSON Web Tokens) with HMAC-SHA256:
- **Token Generation**: On signup/signin
- **Token Verification**: Required for protected endpoints
- **Token Format**: `Bearer <token>` in Authorization header
- **Token Expiration**: Configurable via `JWT_EXPIRATION`

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "details": "Additional error details (development only)"
}
```

## 📋 Features

✅ User authentication with JWT
✅ Content management (CRUD)
✅ Collections for organizing content
✅ File uploads to Cloudinary
✅ Full-text search on content
✅ User profiles and follow system
✅ Brain sharing with permission control
✅ Rate limiting per IP
✅ Input validation
✅ Error handling
✅ CORS enabled
✅ Helmet for security headers

## 🔗 Integration with Frontend

Frontend running on `http://localhost:3000` is automatically allowed via CORS.

Configure `CORS_ORIGIN` in `.env.local` to allow different origins.

## 📚 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: jose (JWT)
- **File Upload**: Multer + Cloudinary
- **Security**: Helmet, bcryptjs
- **Validation**: Custom validators

## 🐛 Troubleshooting

### MongoDB Connection Error
```
❌ MongoDB connection failed: ECONNREFUSED
```
- Ensure MongoDB is running locally OR
- Update `MONGODB_URI` to valid cloud connection string

### Port Already in Use
```bash
# Change PORT in .env.local or
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### Type Errors
```bash
# Clear TypeScript cache
rm -rf dist/ .ts-cache/
npm run dev
```

## 📞 Support

For issues or questions about the backend:
1. Check `.env.local` configuration
2. Verify MongoDB connection
3. Review error messages in console
4. Check API response format

---

**Backend fully ported from Next.js to Express.js** ✨
