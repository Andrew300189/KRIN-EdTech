# KRIN-EdTech Routing Guide

## Project Routes Overview

### 🏠 Public Routes (No Authentication Required)

- **`/`** - Home page with sign in/up buttons
- **`/(public)`** - Public route group

### 🔐 Authentication Routes

- **`/auth/login`** - User login page
- **`/auth/register`** - User registration page
- **`/auth/forgot-password`** - Password recovery

**Layout**: Centered form layout with gradient background

### 📚 Dashboard Routes (Authentication Required)

- **`/dashboard`** - Main dashboard with overview
- **`/dashboard/courses`** - List and manage enrolled courses
- **`/dashboard/lessons`** - View lessons
- **`/dashboard/vocabulary`** - Vocabulary learning tools
- **`/dashboard/ai-tutor`** - AI chat tutor
- **`/dashboard/achievements`** - View badges and achievements
- **`/dashboard/profile`** - User profile settings

**Layout**: Sidebar navigation + main content area

### 👨‍💼 Admin Routes (Admin Only)

- **`/admin`** - Admin dashboard with statistics
- **`/admin/users`** - User management
- **`/admin/courses`** - Course management
- **`/admin/analytics`** - Analytics dashboard

**Layout**: Admin sidebar with admin-specific navigation

## API Routes

### Authentication

- **`POST /api/auth/login`** - Login endpoint
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- **`POST /api/auth/register`** - Registration endpoint
  - Body: `{ name, email, password }`
  - Returns: `{ user }`

### Courses

- **`GET /api/courses`** - Get all courses
- **`POST /api/courses`** - Create new course (admin)

### Health Check

- **`GET /api/health`** - API health status

## Route Structure

```
src/app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Old default (not used)
├── error.tsx                  # Error boundary
├── loading.tsx                # Loading state
├── not-found.tsx              # 404 page
├── globals.css                # Global styles
│
├── (public)/                  # Public route group
│   ├── layout.tsx
│   └── page.tsx               # Home page
│
├── (auth)/                    # Auth route group
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── forgot-password/
│       └── page.tsx
│
├── (dashboard)/               # Dashboard route group
│   ├── layout.tsx
│   ├── page.tsx               # Dashboard home
│   ├── courses/
│   │   └── page.tsx
│   ├── lessons/
│   │   └── page.tsx
│   ├── vocabulary/
│   │   └── page.tsx
│   ├── ai-tutor/
│   │   └── page.tsx
│   ├── achievements/
│   │   └── page.tsx
│   └── profile/
│       └── page.tsx
│
├── (admin)/                   # Admin route group
│   ├── layout.tsx
│   ├── page.tsx               # Admin dashboard
│   └── users/
│       └── page.tsx
│
└── api/                       # API routes
    ├── auth/
    │   ├── login/
    │   │   └── route.ts
    │   └── register/
    │       └── route.ts
    ├── courses/
    │   └── route.ts
    └── health/
        └── route.ts
```

## Route Groups

Route groups (parentheses) don't affect URLs but help organize code:

- `(public)` - Public pages
- `(auth)` - Authentication pages
- `(dashboard)` - Authenticated dashboard
- `(admin)` - Admin-only pages

## Usage in Components

```tsx
// Import routes constant
import { ROUTES } from '@/core/constants';

// Use in links
<Link href={ROUTES.DASHBOARD.HOME}>Dashboard</Link>
<Link href={ROUTES.AUTH.LOGIN}>Sign In</Link>

// Use in API calls
const response = await fetch(ROUTES.API.AUTH.LOGIN, {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
```

## Next Steps

1. ✅ Routes created
2. ⏳ Add middleware for authentication (src/middleware.ts)
3. ⏳ Implement API route handlers with database
4. ⏳ Add form validation and error handling
5. ⏳ Connect UI to API endpoints
6. ⏳ Add protected routes
