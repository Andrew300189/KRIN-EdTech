import Stripe from "stripe";
import { prisma } from "@/core/server/prisma";
import type {
  CancelResult,
  CheckoutResult,
  CreateCheckoutInput,
  CreateRefundInput,
  PaymentProvider,
  RefundResult,
  VerifiedPaymentEvent,
  VerifyWebhookInput,
} from "@/modules/payments/types/payment-provider.types";

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  return key;
}

export function getStripeClient() {
  return new Stripe(getStripeSecretKey());
}

export async function getOrCreateStripeCustomer(user: { id: string; email: string; name: string; stripeCustomerId: string | null }) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripeClient().customers.create({ email: user.email, name: user.name, metadata: { krinUserId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function createCustomerPortal(customerId: string, origin: string) {
  const session = await getStripeClient().billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/dashboard/billing` });
  return session.url;
}

function stripeInterval(period: CreateCheckoutInput["price"]["billingPeriod"]): "month" | "year" {
  return period === "YEAR" ? "year" : "month";
}

function eventStatus(event: Stripe.Event): VerifiedPaymentEvent["status"] {
  if (event.type === "checkout.session.expired") return "EXPIRED";
  if (event.type === "payment_intent.payment_failed" || event.type === "invoice.payment_failed") return "FAILED";
  if (event.type === "charge.refunded") return "REFUNDED";
  if (event.type === "customer.subscription.deleted") return "CANCELED";
  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded" || event.type === "invoice.paid") return "SUCCEEDED";
  return "PROCESSING";
}

function eventData(event: Stripe.Event) {
  return event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent | Stripe.Invoice | Stripe.Subscription | Stripe.Charge;
}

function metadataOf(value: Stripe.Event["data"]["object"]) {
  return "metadata" in value && value.metadata ? value.metadata : {};
}

export class StripePaymentProvider implements PaymentProvider {
  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const customer = await getOrCreateStripeCustomer(input.user);
    const isSubscription = input.order.type === "SUBSCRIPTION";
    const pendingUrl = new URL("/payment/pending", input.origin);
    pendingUrl.searchParams.set("order", input.order.number);
    pendingUrl.searchParams.set("paymentId", input.payment.id);
    const failedUrl = new URL("/payment/failed", input.origin);
    failedUrl.searchParams.set("order", input.order.number);
    failedUrl.searchParams.set("paymentId", input.payment.id);
    const metadata = { orderId: input.order.id, userId: input.user.id, productId: input.product.id, environment: process.env.NODE_ENV || "development" };
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency: input.price.currency.toLowerCase(),
        unit_amount: input.price.amount,
        product_data: { name: input.product.title, description: input.product.description ?? undefined },
        ...(isSubscription ? { recurring: { interval: stripeInterval(input.price.billingPeriod) } } : {}),
      },
    };
    const session = await getStripeClient().checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer,
      client_reference_id: input.user.id,
      line_items: [lineItem],
      success_url: pendingUrl.toString(),
      cancel_url: failedUrl.toString(),
      metadata,
      ...(isSubscription ? { subscription_data: { metadata, ...(input.product.trialDays > 0 ? { trial_period_days: input.product.trialDays } : {}) } } : { payment_intent_data: { metadata } }),
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return {
      kind: "redirect",
      url: session.url,
      providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      providerSessionId: session.id,
      providerPriceId: input.price.providerPriceId ?? undefined,
      providerMetadata: { checkoutSessionId: session.id },
      amount: session.amount_total ?? input.price.amount,
      currency: (session.currency ?? input.price.currency).toUpperCase(),
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent> {
    const signature = input.signature;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) throw new Error("Stripe webhook is not configured.");
    const event = getStripeClient().webhooks.constructEvent(input.body, signature, secret);
    const object = eventData(event);
    const metadata = metadataOf(event.data.object);
    const amount = "amount_total" in object ? object.amount_total : "amount_received" in object ? object.amount_received : "amount_paid" in object ? object.amount_paid : null;
    const currency = "currency" in object && object.currency ? object.currency.toUpperCase() : null;
    const providerCheckoutId = event.type.startsWith("checkout.session") ? object.id : null;
    const providerPaymentId = "payment_intent" in object && typeof object.payment_intent === "string" ? object.payment_intent : event.type.startsWith("payment_intent") ? object.id : null;
    const providerSubscriptionId = "subscription" in object && typeof object.subscription === "string" ? object.subscription : event.type.startsWith("customer.subscription") ? object.id : null;
    return { provider: "STRIPE", eventId: event.id, eventType: event.type, orderId: metadata.orderId ?? null, providerCheckoutId, providerPaymentId, providerSubscriptionId, amount, currency, status: eventStatus(event), occurredAt: new Date(event.created * 1000), rawReference: event.id, metadata };
  }

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    const refund = await getStripeClient().refunds.create({ payment_intent: input.providerPaymentId, ...(input.amount ? { amount: input.amount } : {}), ...(input.reason ? { reason: "requested_by_customer" } : {}) });
    return { providerRefundId: refund.id, amount: refund.amount, status: refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" ? "FAILED" : "PENDING" };
  }

  async cancelSubscription(input: { providerSubscriptionId: string; atPeriodEnd?: boolean }): Promise<CancelResult> {
    const subscription = input.atPeriodEnd === false
      ? await getStripeClient().subscriptions.cancel(input.providerSubscriptionId)
      : await getStripeClient().subscriptions.update(input.providerSubscriptionId, { cancel_at_period_end: true });
    return { cancelAtPeriodEnd: subscription.cancel_at_period_end, canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null };
  }
}
