import { StripePaymentProvider } from "@/modules/payments/services/stripe.service";
import { LiqPayPaymentProvider } from "@/modules/payments/services/liqpay.service";
import type { PaymentProvider, PaymentProviderName } from "@/modules/payments/types/payment-provider.types";

const providers: Record<PaymentProviderName, PaymentProvider> = {
  STRIPE: new StripePaymentProvider(),
  LIQPAY: new LiqPayPaymentProvider(),
};

export function getPaymentProvider(provider: PaymentProviderName) {
  return providers[provider];
}
