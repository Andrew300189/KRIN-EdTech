import { apiClient } from './apiClient';

export const courseService = {
  list: () => apiClient.get('/courses'),
  getById: (id: string) => apiClient.get(`/courses/${id}`),
};
