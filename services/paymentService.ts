import { apiClient } from './apiClient';

export const paymentService = {
  getPlans: () => apiClient.get('/payments/plans'),
  checkout: (planId: string) => apiClient.post('/payments/checkout', { planId }),
};
