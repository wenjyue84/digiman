# API Documentation
# PelangiManager - Capsule Hostel Management System

**Document Version:** 1.0  
**Date:** December 2024  
**Project:** Pelangi Capsule Hostel Management System  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Base URL and Headers](#3-base-url-and-headers)
4. [Response Format](#4-response-format)
5. [Error Handling](#5-error-handling)
6. [Endpoints](#6-endpoints)
7. [WebSocket API](#7-websocket-api)
8. [Rate Limiting](#8-rate-limiting)
9. [Examples](#9-examples)

---

## 1. Overview

The PelangiManager API provides a comprehensive RESTful interface for managing capsule hostel operations. The API supports both traditional REST endpoints and real-time WebSocket communication for live updates.

### API Version
- **Current Version**: v1
- **Base URL**: `/api`
- **Protocol**: HTTP/HTTPS + WebSocket

### Features
- **RESTful Design**: Standard HTTP methods and status codes
- **Real-time Updates**: WebSocket-based live data synchronization
- **Authentication**: JWT-based session management
- **Validation**: Comprehensive input validation with Zod schemas
- **Pagination**: Built-in pagination for large datasets
- **File Uploads**: Support for file and image uploads

---

## 2. Authentication

### Authentication Methods

#### 1. Local Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### 2. Google OAuth
```http
GET /api/auth/google
# Redirects to Google OAuth consent screen
```

#### 3. Session Management
- **Session Token**: Stored in HTTP-only cookies
- **Session Expiry**: Configurable session timeout
- **Automatic Renewal**: Sessions refresh on activity

### Protected Endpoints
Most endpoints require authentication. Include the session cookie in requests:
```http
GET /api/guests
Cookie: session=your_session_token_here
```

---

## 3. Base URL and Headers

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://yourdomain.com/api`

### Required Headers
```http
Content-Type: application/json
Accept: application/json
```

### Optional Headers
```http
Authorization: Bearer <jwt_token>  # Alternative to session cookies
User-Agent: YourApp/1.0
```

---

## 4. Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "data": [
      // Array of items
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 5. Error Handling

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Internal Server Error

### Common Error Codes
- **VALIDATION_ERROR**: Input validation failed
- **AUTHENTICATION_FAILED**: Invalid credentials
- **UNAUTHORIZED**: Insufficient permissions
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **INTERNAL_ERROR**: Server-side error

---

## 6. Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "admin",
      "email": "admin@pelangi.com",
      "role": "admin"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/logout
Log out current user and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@pelangi.com",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

#### GET /api/auth/google
Initiate Google OAuth authentication flow.

**Response:** Redirects to Google OAuth consent screen.

#### GET /api/auth/google/callback
Handle Google OAuth callback.

**Query Parameters:**
- `code`: Authorization code from Google
- `state`: State parameter for security

**Response:** Redirects to application with session established.

### Guest Management Endpoints

#### GET /api/guests
Get paginated list of guests.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for guest names
- `status`: Filter by check-in status (checked_in, checked_out)
- `capsule`: Filter by capsule number

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "guest_id",
        "name": "John Doe",
        "capsuleNumber": "C1",
        "checkinTime": "2024-12-01T10:00:00Z",
        "isCheckedIn": true,
        "paymentAmount": "50.00",
        "paymentMethod": "cash",
        "isPaid": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### POST /api/guests
Create a new guest record.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "capsuleNumber": "C2",
  "expectedCheckoutDate": "2024-12-03",
  "paymentAmount": "75.00",
  "paymentMethod": "card",
  "gender": "female",
  "nationality": "US",
  "phoneNumber": "+1234567890",
  "email": "jane@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_guest_id",
    "name": "Jane Smith",
    "capsuleNumber": "C2",
    "checkinTime": "2024-12-01T12:00:00Z",
    "isCheckedIn": true
  },
  "message": "Guest created successfully"
}
```

#### PUT /api/guests/:id
Update an existing guest record.

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "paymentAmount": "80.00",
  "notes": "Extended stay request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "guest_id",
    "name": "Jane Smith Updated",
    "paymentAmount": "80.00",
    "notes": "Extended stay request"
  },
  "message": "Guest updated successfully"
}
```

#### DELETE /api/guests/:id
Delete a guest record.

**Response:**
```json
{
  "success": true,
  "message": "Guest deleted successfully"
}
```

#### POST /api/guests/checkin
Check in a guest to a capsule.

**Request Body:**
```json
{
  "name": "New Guest",
  "capsuleNumber": "C3",
  "expectedCheckoutDate": "2024-12-05",
  "paymentAmount": "100.00",
  "paymentMethod": "cash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guest": {
      "id": "guest_id",
      "name": "New Guest",
      "capsuleNumber": "C3",
      "checkinTime": "2024-12-01T14:00:00Z",
      "isCheckedIn": true
    },
    "capsule": {
      "id": "capsule_id",
      "number": "C3",
      "isAvailable": false
    }
  },
  "message": "Guest checked in successfully"
}
```

#### POST /api/guests/checkout
Check out a guest from a capsule.

**Request Body:**
```json
{
  "guestId": "guest_id",
  "notes": "Early checkout requested"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guest": {
      "id": "guest_id",
      "checkoutTime": "2024-12-01T16:00:00Z",
      "isCheckedIn": false
    },
    "capsule": {
      "id": "capsule_id",
      "number": "C3",
      "isAvailable": true
    }
  },
  "message": "Guest checked out successfully"
}
```

### Capsule Management Endpoints

#### GET /api/capsules
Get list of all capsules.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "capsule_id",
      "number": "C1",
      "section": "back",
      "isAvailable": false,
      "cleaningStatus": "cleaned",
      "position": "bottom",
      "color": "blue"
    }
  ]
}
```

#### POST /api/capsules
Create a new capsule.

**Request Body:**
```json
{
  "number": "C27",
  "section": "front",
  "position": "top",
  "color": "green"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_capsule_id",
    "number": "C27",
    "section": "front",
    "isAvailable": true,
    "cleaningStatus": "cleaned"
  },
  "message": "Capsule created successfully"
}
```

#### PUT /api/capsules/:id
Update capsule information.

**Request Body:**
```json
{
  "cleaningStatus": "to_be_cleaned",
  "color": "red"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "capsule_id",
    "cleaningStatus": "to_be_cleaned",
    "color": "red"
  },
  "message": "Capsule updated successfully"
}
```

#### POST /api/capsules/:id/clean
Mark capsule as cleaned.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "capsule_id",
    "cleaningStatus": "cleaned",
    "lastCleanedAt": "2024-12-01T18:00:00Z",
    "lastCleanedBy": "admin"
  },
  "message": "Capsule marked as cleaned"
}
```

### Maintenance Endpoints

#### GET /api/problems
Get paginated list of maintenance problems.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by resolution status (resolved, unresolved)
- `capsule`: Filter by capsule number

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "problem_id",
        "capsuleNumber": "C5",
        "description": "Light not working",
        "reportedBy": "admin",
        "reportedAt": "2024-12-01T10:00:00Z",
        "isResolved": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### POST /api/problems
Report a new maintenance problem.

**Request Body:**
```json
{
  "capsuleNumber": "C5",
  "description": "Light not working",
  "notes": "Guest reported flickering light"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_problem_id",
    "capsuleNumber": "C5",
    "description": "Light not working",
    "reportedBy": "admin",
    "reportedAt": "2024-12-01T10:00:00Z",
    "isResolved": false
  },
  "message": "Problem reported successfully"
}
```

#### PUT /api/problems/:id
Update problem information.

**Request Body:**
```json
{
  "description": "Light not working - bulb needs replacement",
  "notes": "Ordered new LED bulb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "problem_id",
    "description": "Light not working - bulb needs replacement",
    "notes": "Ordered new LED bulb"
  },
  "message": "Problem updated successfully"
}
```

#### POST /api/problems/:id/resolve
Mark problem as resolved.

**Request Body:**
```json
{
  "notes": "Replaced light bulb, working now"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "problem_id",
    "isResolved": true,
    "resolvedBy": "admin",
    "resolvedAt": "2024-12-01T15:00:00Z",
    "notes": "Replaced light bulb, working now"
  },
  "message": "Problem marked as resolved"
}
```

### Configuration Endpoints

#### GET /api/config
Get current system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "hostelName": "Pelangi Capsule Hostel",
    "checkinTime": "14:00",
    "checkoutTime": "11:00",
    "currency": "USD",
    "taxRate": 0.10,
    "maxStayDays": 30
  }
}
```

#### PUT /api/config
Update system configuration.

**Request Body:**
```json
{
  "hostelName": "Pelangi Capsule Hostel - Updated",
  "checkinTime": "15:00",
  "maxStayDays": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hostelName": "Pelangi Capsule Hostel - Updated",
    "checkinTime": "15:00",
    "checkoutTime": "11:00",
    "currency": "USD",
    "taxRate": 0.10,
    "maxStayDays": 45
  },
  "message": "Configuration updated successfully"
}
```

#### POST /api/config/reset
Reset configuration to default values.

**Response:**
```json
{
  "success": true,
  "message": "Configuration reset to defaults"
}
```

### File Management Endpoints

#### POST /api/upload
Upload a file or image.

**Request Body:** Multipart form data
- `file`: File to upload
- `type`: File type (guest_photo, capsule_photo, document)
- `relatedId`: ID of related entity (guest, capsule, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file_id",
    "filename": "guest_photo.jpg",
    "url": "/api/files/file_id",
    "size": 1024000,
    "type": "image/jpeg"
  },
  "message": "File uploaded successfully"
}
```

#### GET /api/files/:id
Get file content.

**Response:** File content with appropriate Content-Type header.

#### DELETE /api/files/:id
Delete a file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## 7. WebSocket API

### Connection
Connect to WebSocket endpoint for real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:5000');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Types

#### Guest Updates
```json
{
  "type": "guest_update",
  "action": "checkin",
  "data": {
    "guest": { /* guest data */ },
    "capsule": { /* capsule data */ }
  }
}
```

#### Capsule Updates
```json
{
  "type": "capsule_update",
  "action": "clean",
  "data": {
    "capsule": { /* capsule data */ }
  }
}
```

#### Maintenance Updates
```json
{
  "type": "maintenance_update",
  "action": "report",
  "data": {
    "problem": { /* problem data */ }
  }
}
```

---

## 8. Rate Limiting

### Limits
- **Authentication**: 5 requests per minute per IP
- **API Endpoints**: 100 requests per minute per user
- **File Uploads**: 10 uploads per minute per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 9. Examples

### Complete Guest Check-in Flow

#### 1. Authenticate User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

#### 2. Check in Guest
```bash
curl -X POST http://localhost:5000/api/guests/checkin \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token" \
  -d '{
    "name": "John Doe",
    "capsuleNumber": "C1",
    "expectedCheckoutDate": "2024-12-05",
    "paymentAmount": "100.00",
    "paymentMethod": "cash"
  }'
```

#### 3. Upload Guest Photo
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Cookie: session=your_session_token" \
  -F "file=@guest_photo.jpg" \
  -F "type=guest_photo" \
  -F "relatedId=guest_id_here"
```

### Real-time Dashboard Updates

#### JavaScript Example
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5000');

// Handle guest updates
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'guest_update') {
    if (data.action === 'checkin') {
      updateDashboard(data.data);
    }
  }
});

function updateDashboard(data) {
  // Update UI with new data
  const guestCount = document.getElementById('guest-count');
  guestCount.textContent = data.totalGuests;
  
  // Update capsule status
  updateCapsuleStatus(data.capsule);
}
```

### Error Handling Example

#### JavaScript Example
```javascript
async function createGuest(guestData) {
  try {
    const response = await fetch('/api/guests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guestData),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Handle validation errors
      showValidationErrors(error.details);
    } else if (error.name === 'AuthenticationError') {
      // Handle authentication errors
      redirectToLogin();
    } else {
      // Handle other errors
      showErrorMessage(error.message);
    }
  }
}
```

---

## Conclusion

This API provides a comprehensive interface for managing all aspects of the PelangiManager system. The RESTful design ensures consistency and ease of use, while WebSocket support enables real-time updates for a responsive user experience.

For additional support or questions about the API, please refer to the troubleshooting guide or contact the development team.
