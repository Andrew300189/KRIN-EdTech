import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { getPaymentProvider } from "@/modules/payments/services/payment-provider.factory";
import { grantEntitlementsForOrder, revokeOrderEntitlements } from "@/modules/payments/services/entitlement.service";
import { notificationService } from "@/modules/communications/services/notification.service";
import type { CheckoutResult, PaymentProviderName, VerifiedPaymentEvent } from "@/modules/payments/types/payment-provider.types";

type PurchaseUser = { id: string; email: string; name: string; stripeCustomerId: string | null };
type Tx = Prisma.TransactionClient;

function orderNumber() { return `KRIN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`; }
function orderType(productType: string) { return productType === "SUBSCRIPTION_PLAN" ? "SUBSCRIPTION" as const : "ONE_TIME_PURCHASE" as const; }

export function calculatePromotionDiscount(subtotal: number, promotion: { type: "PERCENT" | "FIXED"; amount: number; maxDiscount: number | null; currency: string | null } | null, currency: string) {
  if (!promotion || subtotal <= 0 || (promotion.currency && promotion.currency !== currency)) return 0;
  const raw = promotion.type === "PERCENT" ? Math.floor(subtotal * promotion.amount / 100) : promotion.amount;
  return Math.max(0, Math.min(subtotal, promotion.maxDiscount ?? raw, raw));
}

async function validPromotion(tx: Tx, userId: string, code: string | undefined, currency: string) {
  if (!code) return null;
  const now = new Date();
  const promotion = await tx.promotion.findUnique({ where: { code: code.toUpperCase() } });
  if (!promotion || !promotion.isActive || (promotion.startsAt && promotion.startsAt > now) || (promotion.endsAt && promotion.endsAt <= now) || (promotion.currency && promotion.currency !== currency)) throw new Error("This promotion code is not available.");
  const [uses, personalUses] = await Promise.all([tx.promotionRedemption.count({ where: { promotionId: promotion.id } }), tx.promotionRedemption.count({ where: { promotionId: promotion.id, userId } })]);
  if ((promotion.usageLimit && uses >= promotion.usageLimit) || personalUses >= promotion.perUserLimit) throw new Error("This promotion code has reached its limit.");
  return promotion;
}

export async function createCheckout(input: { user: PurchaseUser; provider: PaymentProviderName; productPriceId: string; origin: string; idempotencyKey?: string; promotionCode?: string }): Promise<{ orderId: string; orderNumber: string; paymentId: string; checkout: CheckoutResult }> {
  const key = input.idempotencyKey || randomUUID();
  const prepared = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { idempotencyKey: key }, include: { payments: true } });
    if (existing) {
      const payment = existing.payments[0];
      if (!payment) throw new Error("Checkout order is incomplete.");
      throw new Error("This checkout request has already been used. Start a new payment attempt.");
    }
    const price = await tx.productPrice.findUnique({ where: { id: input.productPriceId }, include: { product: { include: { plan: true } } } });
    if (!price || !price.isActive || price.provider !== input.provider || !price.product.isActive || !price.product.isPublic) throw new Error("This product price is unavailable.");
    if (!["USD", "UAH", "EUR"].includes(price.currency) || price.amount <= 0) throw new Error("This product price is invalid.");
    if (price.product.courseId) {
      const alreadyOwned = await tx.entitlement.findFirst({ where: { userId: input.user.id, courseId: price.product.courseId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, select: { id: true } });
      if (alreadyOwned) throw new Error("You already have access to this course.");
    }
    if (price.product.type === "SUBSCRIPTION_PLAN") {
      const activeSubscription = await tx.entitlement.findFirst({ where: { userId: input.user.id, type: "SUBSCRIPTION", status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, select: { id: true } });
      if (activeSubscription) throw new Error("An active subscription already exists.");
    }
    const promotion = await validPromotion(tx, input.user.id, input.promotionCode, price.currency);
    const discount = calculatePromotionDiscount(price.amount, promotion, price.currency);
    const order = await tx.order.create({ data: { userId: input.user.id, number: orderNumber(), type: orderType(price.product.type), status: "PENDING", currency: price.currency, subtotalAmount: price.amount, discountAmount: discount, taxAmount: 0, totalAmount: price.amount - discount, provider: input.provider, idempotencyKey: key, promotionCode: promotion?.code, metadata: { productPriceId: price.id } } });
    const payment = await tx.payment.create({ data: { userId: input.user.id, orderId: order.id, provider: input.provider, plan: price.product.plan?.code ?? "FREE", billingPeriod: price.billingPeriod, amount: order.totalAmount, currency: price.currency, status: "CREATED", description: price.product.title } });
    const item = await tx.orderItem.create({ data: { orderId: order.id, productId: price.productId, productPriceId: price.id, titleSnapshot: price.product.title, unitAmount: price.amount, totalAmount: price.amount } });
    return { order, payment, item, price };
  });
  try {
    const checkout = await getPaymentProvider(input.provider).createCheckoutSession({ order: { id: prepared.order.id, number: prepared.order.number, type: prepared.order.type }, payment: { id: prepared.payment.id, description: prepared.payment.description }, user: input.user, product: { id: prepared.price.product.id, title: prepared.price.product.title, description: prepared.price.product.description, type: prepared.price.product.type, trialDays: prepared.price.product.plan?.trialDays ?? 0 }, price: { id: prepared.price.id, amount: prepared.order.totalAmount, currency: prepared.price.currency, billingPeriod: prepared.price.billingPeriod, providerPriceId: prepared.price.providerPriceId }, origin: input.origin });
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: prepared.order.id }, data: { providerCheckoutId: checkout.providerSessionId ?? checkout.providerOrderId ?? null } });
      await tx.payment.update({ where: { id: prepared.payment.id }, data: { providerPaymentId: checkout.providerPaymentId ?? null, providerSessionId: checkout.providerSessionId ?? null, providerOrderId: checkout.providerOrderId ?? null, providerMetadata: checkout.providerMetadata ?? undefined, status: "PENDING" } });
    });
    return { orderId: prepared.order.id, orderNumber: prepared.order.number, paymentId: prepared.payment.id, checkout };
  } catch (error) {
    await prisma.$transaction(async (tx) => { await tx.payment.update({ where: { id: prepared.payment.id }, data: { status: "FAILED", failureMessage: "Checkout session creation failed", failedAt: new Date() } }); await tx.order.update({ where: { id: prepared.order.id }, data: { status: "FAILED" } }); });
    throw error;
  }
}

async function recordProviderEvent(tx: Tx, event: VerifiedPaymentEvent, paymentId: string | null) {
  const existing = await tx.paymentEvent.findUnique({ where: { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } } });
  if (existing) return { duplicate: true, event: existing };
  return { duplicate: false, event: await tx.paymentEvent.create({ data: { paymentId, provider: event.provider, providerEventId: event.eventId, eventType: event.eventType, status: event.status === "SUCCEEDED" ? "PAID" : event.status, payloadHash: event.rawReference, processingStatus: "PROCESSING", receivedAt: new Date() } }) };
}

export async function processVerifiedPaymentEvent(event: VerifiedPaymentEvent) {
  const result = await prisma.$transaction(async (tx) => {
    const order = event.orderId
      ? await tx.order.findUnique({ where: { id: event.orderId }, include: { payments: true } })
      : event.providerCheckoutId
        ? await tx.order.findUnique({ where: { providerCheckoutId: event.providerCheckoutId }, include: { payments: true } })
        : null;
    const payment = order?.payments.find((item) => item.provider === event.provider) ?? null;
    const stored = await recordProviderEvent(tx, event, payment?.id ?? null);
    if (stored.duplicate) return { processed: false, duplicate: true };
    if (!order || !payment) { await tx.paymentEvent.update({ where: { id: stored.event.id }, data: { processingStatus: "IGNORED", processedAt: new Date(), errorMessage: "Order not found" } }); return { processed: false, ignored: true }; }
    if ((event.amount != null && event.amount !== order.totalAmount) || (event.currency && event.currency !== order.currency)) { await tx.paymentEvent.update({ where: { id: stored.event.id }, data: { processingStatus: "FAILED", processedAt: new Date(), errorMessage: "Amount or currency mismatch" } }); return { processed: false, rejected: true }; }
    if (event.eventType.startsWith("customer.subscription.")) {
      if (event.providerSubscriptionId) {
        const subscription = await tx.subscription.findFirst({ where: { provider: event.provider, providerSubscriptionId: event.providerSubscriptionId } });
        if (subscription) await tx.subscription.update({ where: { id: subscription.id }, data: { status: event.status === "CANCELED" ? "CANCELED" : event.status === "FAILED" ? "PAST_DUE" : "ACTIVE", canceledAt: event.status === "CANCELED" ? event.occurredAt : null } });
      }
      await tx.paymentEvent.update({ where: { id: stored.event.id }, data: { processingStatus: "PROCESSED", processedAt: new Date() } });
      return { processed: true, subscriptionEvent: true };
    }
    const paymentStatus = event.status === "SUCCEEDED" ? "PAID" : event.status;
    await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: event.providerPaymentId ?? payment.providerPaymentId, providerSessionId: event.providerCheckoutId ?? payment.providerSessionId, providerStatus: event.eventType, status: paymentStatus, ...(event.status === "SUCCEEDED" ? { paidAt: event.occurredAt } : event.status === "FAILED" ? { failedAt: event.occurredAt, failureMessage: event.eventType } : {}) } });
    if (event.status === "SUCCEEDED") {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: event.occurredAt } });
      await grantEntitlementsForOrder(tx, order.id, payment.id);
      if (event.providerSubscriptionId) await tx.subscription.updateMany({ where: { sourcePaymentId: payment.id }, data: { providerSubscriptionId: event.providerSubscriptionId } });
      if (order.promotionCode) {
        const promotion = await tx.promotion.findUnique({ where: { code: order.promotionCode } });
        if (promotion) await tx.promotionRedemption.upsert({ where: { orderId: order.id }, create: { promotionId: promotion.id, userId: order.userId, orderId: order.id, discountAmount: order.discountAmount }, update: {} });
      }
    } else if (event.status === "REFUNDED") {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      await revokeOrderEntitlements(tx, order.id, "Provider refund");
    } else if (event.status === "FAILED" || event.status === "CANCELED" || event.status === "EXPIRED") {
      await tx.order.update({ where: { id: order.id }, data: { status: event.status } });
    }
    await tx.paymentEvent.update({ where: { id: stored.event.id }, data: { processingStatus: "PROCESSED", processedAt: new Date() } });
    return { processed: true, orderId: order.id };
  });
  if (result.processed && "orderId" in result && result.orderId) {
    try {
      const order = await prisma.order.findUnique({ where: { id: result.orderId }, include: { user: { select: { name: true } }, items: { select: { titleSnapshot: true }, take: 1 } } });
      if (order) {
        const amount = new Intl.NumberFormat("en", { style: "currency", currency: order.currency }).format(order.totalAmount / 100);
        const eventKey = `billing-notification:${event.provider}:${event.eventId}`;
        if (event.status === "SUCCEEDED") {
          await notificationService.createNotification({ userId: order.userId, type: "PAYMENT_SUCCEEDED", idempotencyKey: eventKey, entityType: "Order", entityId: order.id, title: "Payment confirmed", message: `Your payment of ${amount} for ${order.items[0]?.titleSnapshot ?? "your purchase"} was confirmed.`, actionUrl: "/dashboard/billing", actionLabel: "View billing", payload: { amount, currency: order.currency } });
          await notificationService.createNotification({ userId: order.userId, type: "COURSE_ACCESS_GRANTED", idempotencyKey: `${eventKey}:access`, entityType: "Order", entityId: order.id, title: "Access granted", message: "Your new learning access is ready.", actionUrl: "/dashboard/courses", actionLabel: "Open courses" });
        } else if (event.status === "FAILED") {
          await notificationService.createNotification({ userId: order.userId, type: "PAYMENT_FAILED", idempotencyKey: eventKey, entityType: "Order", entityId: order.id, title: "Payment was not completed", message: "Your payment could not be completed. You can safely try again from billing.", actionUrl: "/dashboard/billing", actionLabel: "Open billing" });
        } else if (event.status === "REFUNDED") {
          await notificationService.createNotification({ userId: order.userId, type: "REFUND_SUCCEEDED", idempotencyKey: eventKey, entityType: "Order", entityId: order.id, title: "Refund confirmed", message: "Your refund was confirmed by the payment provider.", actionUrl: "/dashboard/billing", actionLabel: "View billing" });
        }
      }
    } catch (error) { console.error("[communications] billing notification failed", error); }
  }
  return result;
}

export async function cancelSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, userId } });
  if (!subscription?.providerSubscriptionId) throw new Error("This subscription cannot be cancelled automatically.");
  const result = await getPaymentProvider(subscription.provider).cancelSubscription({ providerSubscriptionId: subscription.providerSubscriptionId, atPeriodEnd: true });
  const updated = await prisma.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: result.cancelAtPeriodEnd, canceledAt: result.canceledAt ?? null } });
  try { await notificationService.createNotification({ userId, type: "SUBSCRIPTION_CANCELING", idempotencyKey: `subscription-canceling:${subscription.id}`, entityType: "Subscription", entityId: subscription.id, title: "Subscription renewal cancelled", message: "Your subscription remains active until the end of the current billing period.", actionUrl: "/dashboard/billing", actionLabel: "View billing" }); }
  catch (error) { console.error("[communications] subscription notification failed", error); }
  return updated;
}

export async function createRefund(adminId: string, paymentId: string, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment?.providerPaymentId || payment.status !== "PAID") throw new Error("Only a successful provider payment can be refunded.");
  const result = await getPaymentProvider(payment.provider).createRefund({ providerPaymentId: payment.providerPaymentId, amount: payment.amount, reason });
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({ data: { paymentId, providerRefundId: result.providerRefundId, amount: result.amount, currency: payment.currency, status: result.status, reason, createdById: adminId } });
    await tx.contentAuditLog.create({ data: { actorId: adminId, action: "PAYMENT_REFUND_REQUESTED", entityType: "Payment", entityId: paymentId, metadata: { refundId: refund.id, provider: payment.provider, amount: result.amount } } });
    return refund;
  });
}

export async function reconcileBilling() {
  const [paidWithoutEntitlement, activeEntitlementsWithoutPaidOrder, pendingSuccessfulPayments] = await Promise.all([
    prisma.order.findMany({ where: { status: "PAID", entitlements: { none: {} } }, select: { id: true, number: true, userId: true, totalAmount: true, currency: true } }),
    prisma.entitlement.findMany({ where: { status: "ACTIVE", order: { is: { status: { not: "PAID" } } } }, select: { id: true, orderId: true, userId: true } }),
    prisma.payment.findMany({ where: { status: "PAID", order: { is: { status: "PENDING" } } }, select: { id: true, orderId: true } }),
  ]);
  return { paidWithoutEntitlement, activeEntitlementsWithoutPaidOrder, pendingSuccessfulPayments };
}
