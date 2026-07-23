import { create } from 'zustand';

interface PaymentState {
  plan: string;
  setPlan: (plan: string) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  plan: 'Free',
  setPlan: (plan) => set({ plan }),
}));
