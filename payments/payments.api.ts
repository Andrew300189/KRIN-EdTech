export const paymentsApi = {
  getPlans: async () => ({ ok: true, plans: [] }),
  createCheckout: async (planId: string) => ({ ok: true, checkoutUrl: `/checkout/${planId}` }),
  getBillingHistory: async () => ({ ok: true, items: [] }),
};
