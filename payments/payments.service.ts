import { paymentsApi } from './payments.api';

export async function fetchPlans() {
  return paymentsApi.getPlans();
}

export async function createCheckoutSession(planId: string) {
  return paymentsApi.createCheckout(planId);
}

export async function fetchBillingHistory() {
  return paymentsApi.getBillingHistory();
}
