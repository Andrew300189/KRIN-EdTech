import { apiClient } from './apiClient';

export const authService = {
  login: (payload: { email: string; password: string }) => apiClient.post('/auth/login', payload),
  register: (payload: { name: string; email: string; password: string }) => apiClient.post('/auth/register', payload),
  refresh: () => apiClient.get('/auth/refresh'),
};
