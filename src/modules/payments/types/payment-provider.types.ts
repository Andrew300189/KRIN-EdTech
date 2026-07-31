export const PAYMENT_PROVIDERS = ["STRIPE", "LIQPAY"] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];
export type CommerceProductType = "SUBSCRIPTION_PLAN" | "COURSE" | "COURSE_BUNDLE" | "MODULE" | "LESSON_PACK";
export type CommerceOrderType = "SUBSCRIPTION" | "ONE_TIME_PURCHASE";
export type CommercePaymentStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "EXPIRED";

export type PaymentProviderUser = {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
};

export type CreateCheckoutInput = {
  order: { id: string; number: string; type: CommerceOrderType };
  payment: { id: string; description: string };
  user: PaymentProviderUser;
  product: { id: string; title: string; description: string | null; type: CommerceProductType; trialDays: number };
  price: { id: string; amount: number; currency: string; billingPeriod: "NONE" | "MONTH" | "QUARTER" | "SEMI_ANNUAL" | "YEAR"; providerPriceId: string | null };
  origin: string;
};

export type CheckoutResult = {
  kind: "redirect" | "form";
  url?: string;
  form?: { action: string; fields: Record<string, string> };
  providerPaymentId?: string;
  providerSessionId?: string;
  providerOrderId?: string;
  providerPriceId?: string;
  providerMetadata?: Record<string, string | number | boolean | null>;
  amount: number;
  currency: string;
};

export type VerifyWebhookInput = { body: string; signature?: string | null };

export type VerifiedPaymentEvent = {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  orderId: string | null;
  providerCheckoutId?: string | null;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: CommercePaymentStatus;
  occurredAt: Date;
  rawReference: string;
  metadata?: Record<string, string | undefined>;
};

export type CreateRefundInput = { providerPaymentId: string; amount?: number; reason?: string };
export type RefundResult = { providerRefundId: string; amount: number; status: "SUCCEEDED" | "PENDING" | "FAILED" };
export type CancelResult = { cancelAtPeriodEnd: boolean; canceledAt?: Date | null };

export interface PaymentProvider {
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>;
  createRefund(input: CreateRefundInput): Promise<RefundResult>;
  cancelSubscription(input: { providerSubscriptionId: string; atPeriodEnd?: boolean }): Promise<CancelResult>;
}

export function isPaymentProvider(value: string): value is PaymentProviderName {
  return PAYMENT_PROVIDERS.includes(value as PaymentProviderName);
}
