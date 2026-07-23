import { apiClient } from './apiClient';

export const aiService = {
  chat: (prompt: string) => apiClient.post('/ai/chat', { prompt }),
  checkEssay: (text: string) => apiClient.post('/ai/essay-check', { text }),
};
