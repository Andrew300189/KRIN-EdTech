export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },
  COURSES: '/courses',
  LESSONS: '/lessons',
  AI: '/ai',
  VOCABULARY: '/vocabulary',
  PAYMENTS: '/payments',
  PROFILE: '/profile',
} as const;
