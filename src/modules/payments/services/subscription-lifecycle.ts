import { prisma } from "@/core/server/prisma";
import type { Prisma } from "@/generated/prisma-client-payments-runtime";
import { hasPremiumPlanAccess, type BillingPeriod, type PaidSubscriptionPlan } from "@/modules/payments/constants/plans";
import type { PaymentProviderName } from "@/modules/payments/types/payment-provider.types";

type ProviderSubscriptionStatus =
  | "NONE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "CANCELED"
  | "UNPAID"
  | "PAUSED";

type PaymentLifecycleStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED" | "EXPIRED";

type ProviderSubscriptionInput = {
  userId: string;
  provider: PaymentProviderName;
  providerSubscriptionId?: string | null;
  providerPriceId?: string | null;
  sourcePaymentId?: string | null;
  plan: PaidSubscriptionPlan;
  status: ProviderSubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd: Date | null;
};

function addAccessPeriod(start: Date, period: BillingPeriod) {
  const result = new Date(start);
  if (period === "YEAR") result.setUTCFullYear(result.getUTCFullYear() + 1);
  else if (period === "SEMI_ANNUAL") result.setUTCMonth(result.getUTCMonth() + 6);
  else if (period === "QUARTER") result.setUTCMonth(result.getUTCMonth() + 3);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

function grantsPremiumAccess(plan: string, status: ProviderSubscriptionStatus, end: Date | null, now = new Date()) {
  return hasPremiumPlanAccess(plan)
    && (status === "ACTIVE" || status === "TRIALING")
    && Boolean(end && end.getTime() > now.getTime());
}

async function refreshUserSubscriptionState(transaction: Prisma.TransactionClient, userId: string) {
  const now = new Date();
  const active = await transaction.subscription.findFirst({
    where: {
      userId,
      plan: { in: ["PREMIUM", "CORPORATE"] },
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { gt: now },
    },
    orderBy: { currentPeriodEnd: "desc" },
  });

  await transaction.user.update({
    where: { id: userId },
    data: active
      ? {
        subscriptionPlan: active.plan,
        subscriptionStatus: active.status,
        subscriptionCurrentPeriodEnd: active.currentPeriodEnd,
      }
      : {
        subscriptionPlan: "FREE",
        subscriptionStatus: "NONE",
        subscriptionCurrentPeriodEnd: null,
      },
  });
}

async function upsertProviderSubscription(
  transaction: Prisma.TransactionClient,
  input: ProviderSubscriptionInput,
) {
  const data = {
    providerPriceId: input.providerPriceId ?? null,
    plan: input.plan,
    status: input.status,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: input.currentPeriodEnd,
  };

  const existing = input.providerSubscriptionId
    ? await transaction.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider: input.provider,
          providerSubscriptionId: input.providerSubscriptionId,
        },
      },
    })
    : input.sourcePaymentId
      ? await transaction.subscription.findUnique({ where: { sourcePaymentId: input.sourcePaymentId } })
      : null;

  if (existing) {
    return transaction.subscription.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(input.sourcePaymentId ? { sourcePaymentId: input.sourcePaymentId } : {}),
      },
    });
  }

  return transaction.subscription.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      sourcePaymentId: input.sourcePaymentId ?? null,
      ...data,
    },
  });
}

export async function synchronizeProviderSubscription(input: ProviderSubscriptionInput) {
  await prisma.$transaction(async (transaction) => {
    await upsertProviderSubscription(transaction, input);
    await refreshUserSubscriptionState(transaction, input.userId);
  });
}

export async function activateSubscriptionFromPayment(input: {
  paymentId: string;
  provider: PaymentProviderName;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  providerPriceId?: string | null;
  providerStatus: string;
  currentPeriodEnd?: Date | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({ where: { id: input.paymentId } });
    if (!payment || payment.provider !== input.provider) return null;
    if (payment.plan === "FREE") return null;
    if (payment.status === "PAID") return payment;

    const now = new Date();
    const user = await transaction.user.findUnique({
      where: { id: payment.userId },
      select: { subscriptionCurrentPeriodEnd: true },
    });
    if (!user) return null;
    const start = user.subscriptionCurrentPeriodEnd && user.subscriptionCurrentPeriodEnd > now
      ? user.subscriptionCurrentPeriodEnd
      : now;
    const periodEnd = input.currentPeriodEnd ?? addAccessPeriod(start, payment.billingPeriod);
    const updatedPayment = await transaction.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: input.providerPaymentId ?? payment.providerPaymentId,
        providerStatus: input.providerStatus,
        status: "PAID" as PaymentLifecycleStatus,
        paidAt: now,
      },
    });

    await upsertProviderSubscription(transaction, {
      userId: payment.userId,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      providerPriceId: input.providerPriceId,
      sourcePaymentId: payment.id,
    plan: payment.plan as PaidSubscriptionPlan,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
    });
    await refreshUserSubscriptionState(transaction, payment.userId);
    return updatedPayment;
  });
}

export function hasActiveProviderSubscription(input: ProviderSubscriptionInput) {
  return grantsPremiumAccess(input.plan, input.status, input.currentPeriodEnd);
}
