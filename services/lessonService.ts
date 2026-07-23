import { apiClient } from './apiClient';

export const lessonService = {
  list: () => apiClient.get('/lessons'),
  getById: (id: string) => apiClient.get(`/lessons/${id}`),
};
