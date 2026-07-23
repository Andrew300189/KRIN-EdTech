export interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'canceled' | 'trialing';
  renewsAt?: string;
}
