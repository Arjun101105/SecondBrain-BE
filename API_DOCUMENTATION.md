# Second Brain API Documentation

Complete REST API specification for Second Brain backend.

## Base URL
```
http://localhost:5000/api/v1
```

## Response Format

All endpoints return a consistent response format:

```json
{
  "success": true/false,
  "message": "Response message",
  "statusCode": 200,
  "data": {}
}
```

## Authentication

Protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

---

## 🔐 Auth Endpoints

### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "email": "john@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "statusCode": 201,
  "data": {
    "user": {
      "id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `400` - Invalid username/password/email
- `409` - Username already taken

---

### POST /auth/signin
Login user.

**Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Signed in successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Rate limit exceeded

---

## 📝 Content Endpoints

### GET /content
List all content for authenticated user.

**Query Parameters:**
```
?page=1&limit=10&type=LINK&tag=important
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contents retrieved successfully",
  "statusCode": 200,
  "data": {
    "contents": [
      {
        "_id": "64f8e8b3e5c5e5e5e5e5e5e5",
        "userId": "64f8e8b3e5c5e5e5e5e5e5e5",
        "type": "LINK",
        "title": "My First Bookmark",
        "description": "Interesting article",
        "contentUrl": "https://example.com",
        "tags": ["important", "reading"],
        "collectionIds": [],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

**Errors:**
- `401` - Unauthorized

---

### POST /content
Create new content.

**Request:**
```json
{
  "type": "LINK",
  "title": "Amazing Article",
  "description": "Must read article about tech",
  "contentUrl": "https://example.com/article",
  "tags": ["tech", "learning"],
  "collectionIds": ["64f8e8b3e5c5e5e5e5e5e5e5"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Content created successfully",
  "statusCode": 201,
  "data": {
    "content": {
      "_id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "userId": "64f8e8b3e5c5e5e5e5e5e5e5",
      "type": "LINK",
      "title": "Amazing Article",
      ...
    }
  }
}
```

**Errors:**
- `400` - Invalid content type or title
- `401` - Unauthorized

---

### GET /content/:id
Get specific content.

**Response (200):**
```json
{
  "success": true,
  "message": "Content retrieved successfully",
  "statusCode": 200,
  "data": {
    "content": { ... }
  }
}
```

**Errors:**
- `404` - Content not found
- `401` - Unauthorized

---

### PATCH /content/:id
Update content.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "New description",
  "tags": ["updated", "tag"],
  "collectionIds": ["64f8e8b3e5c5e5e5e5e5e5e5"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Content updated successfully",
  "statusCode": 200,
  "data": { "content": { ... } }
}
```

---

### DELETE /content/:id
Delete content.

**Response (200):**
```json
{
  "success": true,
  "message": "Content deleted successfully",
  "statusCode": 200
}
```

---

### POST /content/upload
Upload file to Cloudinary.

**Request:**
- Form data with `file` field
- Optional fields: `title`, `description`, `tags`, `type`

**Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "statusCode": 201,
  "data": {
    "content": {
      "_id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "type": "DOCUMENT",
      "title": "document.pdf",
      "contentUrl": "https://res.cloudinary.com/...",
      "metadata": {
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "fileType": "pdf",
        "cloudinaryId": "secondbrain/document_id"
      }
    }
  }
}
```

**Errors:**
- `400` - No file provided
- `413` - File too large (>50MB)

---

### GET /content/search/:query
Search content.

**Example:**
```
GET /content/search/important
```

**Response (200):**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "statusCode": 200,
  "data": {
    "contents": [ ... ]
  }
}
```

---

## 📂 Collection Endpoints

### GET /collections
List all collections.

**Response (200):**
```json
{
  "success": true,
  "message": "Collections retrieved successfully",
  "statusCode": 200,
  "data": {
    "collections": [
      {
        "_id": "64f8e8b3e5c5e5e5e5e5e5e5",
        "userId": "64f8e8b3e5c5e5e5e5e5e5e5",
        "name": "Research",
        "description": "Research papers and articles",
        "contentIds": ["64f8e8b3e5c5e5e5e5e5e5e5"],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### POST /collections
Create collection.

**Request:**
```json
{
  "name": "Research Papers",
  "description": "Academic research and papers"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Collection created successfully",
  "statusCode": 201,
  "data": { "collection": { ... } }
}
```

---

### GET /collections/:id
Get collection with content.

**Response (200):**
```json
{
  "success": true,
  "message": "Collection retrieved successfully",
  "statusCode": 200,
  "data": {
    "collection": {
      "_id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "name": "Research",
      "contentIds": [ ... ]
    }
  }
}
```

---

### PATCH /collections/:id
Update collection.

**Request:**
```json
{
  "name": "Updated Collection",
  "description": "New description"
}
```

---

### DELETE /collections/:id
Delete collection.

---

### POST /collections/:id/content
Add content to collection.

**Request:**
```json
{
  "contentId": "64f8e8b3e5c5e5e5e5e5e5e5"
}
```

---

### DELETE /collections/:id/content/:contentId
Remove content from collection.

---

## 👤 User Endpoints

### GET /users/:id
Get user public profile.

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "profile": {
      "bio": "Developer and designer",
      "avatar": "https://example.com/avatar.jpg",
      "followers": [ ... ],
      "following": [ ... ],
      "contentCount": 42
    }
  }
}
```

**Errors:**
- `404` - User not found

---

### PATCH /users/:id
Update own profile.

**Request:**
```json
{
  "email": "newemail@example.com",
  "bio": "Updated bio",
  "avatar": "https://example.com/newavatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "statusCode": 200,
  "data": { ... }
}
```

**Errors:**
- `403` - Cannot update another user's profile

---

### POST /users/:id/follow
Follow user.

**Response (200):**
```json
{
  "success": true,
  "message": "User followed successfully",
  "statusCode": 200,
  "data": {
    "following": [ ... ]
  }
}
```

**Errors:**
- `400` - Cannot follow yourself

---

### DELETE /users/:id/follow
Unfollow user.

**Response (200):**
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "statusCode": 200,
  "data": { "following": [ ... ] }
}
```

---

## 🧠 Brain Sharing Endpoints

### POST /brain/share
Create share link.

**Request:**
```json
{
  "permissions": "view-only",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Share link created successfully",
  "statusCode": 201,
  "data": {
    "shareLink": {
      "hash": "abc123xyz789",
      "url": "http://localhost:5000/brain/abc123xyz789",
      "permissions": "view-only",
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  }
}
```

---

### GET /brain/share
Get current share link.

**Response (200):**
```json
{
  "success": true,
  "message": "Share link retrieved successfully",
  "statusCode": 200,
  "data": { "shareLink": { ... } }
}
```

**Errors:**
- `404` - No share link found

---

### DELETE /brain/share
Delete share link.

**Response (200):**
```json
{
  "success": true,
  "message": "Share link deleted successfully",
  "statusCode": 200
}
```

---

### GET /brain/:hash
Access shared brain (public endpoint - no auth required).

**Response (200):**
```json
{
  "success": true,
  "message": "Shared content retrieved successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "64f8e8b3e5c5e5e5e5e5e5e5",
      "username": "johndoe"
    },
    "contents": [ ... ],
    "collections": [ ... ],
    "permissions": "view-only"
  }
}
```

**Errors:**
- `404` - Share link not found
- `410` - Share link expired

---

## Content Types

Valid content type values:
```
LINK, DOCUMENT, IMAGE, VOICE_NOTE, VIDEO_LINK, SOCIAL_POST, CODE_SNIPPET, RICH_NOTE
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - No/invalid token |
| 403 | Forbidden - Not allowed |
| 404 | Not Found |
| 409 | Conflict - Duplicate entry |
| 410 | Gone - Resource expired |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Window**: 60 seconds (configurable)
- **Limit**: 10 requests per IP (configurable)
- **Error**: `429 Too Many Requests`

## File Upload Limits

- **Maximum size**: 50MB
- **Formats**: Any (PDF, images, documents, audio, video)
- **Storage**: Cloudinary

---

Generated for Second Brain API v1.0
