# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Auth

- `POST /auth/login` - User login
- `GET /auth/register` - Registration disabled (405)
- `POST /auth/register` - Registration disabled (405)
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

### Courses

- `GET /courses` - List all courses
- `GET /courses/:id` - Get course details
- `POST /courses` - Create course (admin only)
- `PUT /courses/:id` - Update course
- `DELETE /courses/:id` - Delete course

### Lessons

- `GET /lessons` - List lessons
- `GET /lessons/:id` - Get lesson details
- `POST /lessons` - Create lesson
- `PUT /lessons/:id` - Update lesson

## Error Handling

All errors follow the standard format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
