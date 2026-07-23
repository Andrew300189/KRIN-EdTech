export interface SubscriptionPlan {
  id: string;
  title: string;
  price: string;
  description: string;
  featured?: boolean;
}

export interface BillingItem {
  id: string;
  date: string;
  amount: string;
  status: string;
}
