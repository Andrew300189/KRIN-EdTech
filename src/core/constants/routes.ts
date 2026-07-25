// Routes constants for the application
export const ROUTES = {
  // Public routes
  HOME: "/",

  // Auth routes
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    FORGOT_PASSWORD: "/auth/forgot-password",
  },

  // Dashboard routes
  DASHBOARD: {
    HOME: "/dashboard",
    COURSES: "/dashboard/courses",
    TEACHER_COURSES: "/dashboard/teacher/courses",
    LESSONS: "/dashboard/lessons",
    VOCABULARY: "/dashboard/vocabulary",
    AI_TUTOR: "/dashboard/ai-tutor",
    ACHIEVEMENTS: "/dashboard/achievements",
    PROFILE: "/dashboard/profile",
  },

  // Admin routes
  ADMIN: {
    HOME: "/admin",
    USERS: "/admin/users",
    COURSES: "/admin/courses",
    ANALYTICS: "/admin/analytics",
  },

  // API routes
  API: {
    AUTH: {
      LOGIN: "/api/auth/login",
      REGISTER: "/api/auth/register",
    },
    COURSES: "/api/courses",
    TEACHER_COURSES: "/api/teacher/courses",
    ADMIN_COURSES: "/api/admin/courses",
    HEALTH: "/api/health",
  },
} as const;
