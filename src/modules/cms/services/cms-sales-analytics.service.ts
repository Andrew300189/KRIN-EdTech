import "server-only";

import { prisma } from "@/core/server/prisma";
import type { PaymentStatus, Prisma, SubscriptionStatus } from "@/generated/prisma-client-payments-runtime";

export const cmsSalesPeriods = [
  "TODAY",
  "YESTERDAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "CUSTOM",
] as const;

export type CmsSalesPeriod = (typeof cmsSalesPeriods)[number];

export type CmsSalesFilters = {
  period: CmsSalesPeriod;
  productId?: string;
  from?: string;
  to?: string;
};

type DateRange = { start: Date; end: Date; previousStart: Date; previousEnd: Date };

export type CmsSalesTransaction = {
  id: string;
  orderNumber: string;
  occurredAt: string;
  student: { id: string; name: string; email: string; purchaseStatus: string };
  items: Array<{ id: string; title: string; type: string; quantity: number; totalAmount: number }>;
  purchaseType: "Single course" | "Course bundle" | "Subscription" | "Mixed order";
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod: string | null;
};

export type CmsSalesAnalytics = {
  generatedAt: string;
  filters: CmsSalesFilters;
  metrics: {
    itemsSold: number;
    uniqueStudents: number;
    revenueByCurrency: Array<{ currency: string; amount: number }>;
    previousItemsSold: number;
    previousUniqueStudents: number;
    previousRevenueByCurrency: Array<{ currency: string; amount: number }>;
  };
  products: Array<{ id: string; title: string }>;
  productRanking: Array<{ productId: string; title: string; type: string; sold: number; revenueByCurrency: Array<{ currency: string; amount: number }> }>;
  buyerRanking: Array<{ id: string; name: string; email: string; itemsBought: number; orders: number; purchaseStatus: string }>;
  transactions: CmsSalesTransaction[];
  activity: Array<{ id: string; studentName: string; productTitle: string; occurredAt: string; provider: string; paymentMethod: string | null; currency: string; amount: number }>;
};

const confirmedOrderStatus = "PAID" as const;
const confirmedPaymentStatuses: PaymentStatus[] = ["PAID", "SUCCEEDED"];
const activeSubscriptionStatuses: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

function atStartOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(value: Date, months: number): Date {
  const result = new Date(value);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(value: Date, years: number): Date {
  const result = new Date(value);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function validDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function dateRangeFor(filters: CmsSalesFilters, now = new Date()): DateRange {
  const today = atStartOfLocalDay(now);
  let start = today;
  let end = addDays(today, 1);

  if (filters.period === "YESTERDAY") {
    start = addDays(today, -1);
    end = today;
  } else if (filters.period === "WEEK") {
    const weekday = (today.getDay() + 6) % 7;
    start = addDays(today, -weekday);
    end = addDays(start, 7);
  } else if (filters.period === "MONTH") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = addMonths(start, 1);
  } else if (filters.period === "YEAR") {
    start = new Date(today.getFullYear(), 0, 1);
    end = addYears(start, 1);
  } else if (filters.period === "CUSTOM") {
    const requestedStart = validDateInput(filters.from);
    const requestedEnd = validDateInput(filters.to);
    if (requestedStart && requestedEnd && requestedEnd >= requestedStart) {
      start = requestedStart;
      end = addDays(requestedEnd, 1);
    }
  }

  const duration = end.valueOf() - start.valueOf();
  return {
    start,
    end,
    previousStart: new Date(start.valueOf() - duration),
    previousEnd: start,
  };
}

function sumByCurrency(rows: Array<{ amount: number; currency: string }>) {
  const amounts = new Map<string, number>();
  rows.forEach((row) => amounts.set(row.currency, (amounts.get(row.currency) ?? 0) + row.amount));
  return [...amounts.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

function buyerName(user: { name: string; email: string }): string {
  return user.name.trim() || user.email;
}

function purchaseType(order: { type: string; items: Array<{ product: { type: string } }> }): CmsSalesTransaction["purchaseType"] {
  if (order.type === "SUBSCRIPTION") return "Subscription";
  const types = new Set(order.items.map((item) => item.product.type));
  if (types.has("COURSE_BUNDLE")) return "Course bundle";
  return types.size > 1 ? "Mixed order" : "Single course";
}

function subscriptionLabel(subscription: { plan: string; planRecord: { title: string } | null } | undefined): string {
  if (!subscription) return "Course purchaser";
  return subscription.planRecord?.title || `${subscription.plan.slice(0, 1)}${subscription.plan.slice(1).toLowerCase()}`;
}

export function parseCmsSalesFilters(input: { period?: string; productId?: string; from?: string; to?: string }): CmsSalesFilters {
  const period = cmsSalesPeriods.includes(input.period as CmsSalesPeriod)
    ? (input.period as CmsSalesPeriod)
    : "MONTH";
  return {
    period,
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
  };
}

/**
 * Canonical sales read model. Only PAID orders are treated as sales, so a
 * checkout attempt, pending payment or provider error can never inflate CMS
 * revenue or buyer metrics. Amounts stay grouped by their transaction currency.
 */
export async function getCmsSalesAnalytics(filters: CmsSalesFilters): Promise<CmsSalesAnalytics> {
  const range = dateRangeFor(filters);
  const productScope = filters.productId ? { items: { some: { productId: filters.productId } } } : {};
  const orderInclude = {
    user: { select: { id: true, name: true, email: true } },
    items: {
      include: {
        product: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
    payments: {
      select: { paymentMethod: true },
      where: { status: { in: confirmedPaymentStatuses } },
      orderBy: { paidAt: "desc" as const },
      take: 1,
    },
  } satisfies Prisma.OrderInclude;

  const [orders, previousOrders, products] = await Promise.all([
    prisma.order.findMany({
      where: { status: confirmedOrderStatus, paidAt: { gte: range.start, lt: range.end }, ...productScope },
      include: orderInclude,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
    prisma.order.findMany({
      where: { status: confirmedOrderStatus, paidAt: { gte: range.previousStart, lt: range.previousEnd }, ...productScope },
      include: { user: { select: { id: true } }, items: { select: { quantity: true } } },
      take: 500,
    }),
    prisma.product.findMany({
      where: { isActive: true, isPublic: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 500,
    }),
  ]);

  const buyerIds = [...new Set(orders.map((order) => order.user.id))];
  const subscriptions = buyerIds.length
    ? await prisma.subscription.findMany({
        where: { userId: { in: buyerIds }, status: { in: [...activeSubscriptionStatuses] } },
        select: { userId: true, plan: true, planRecord: { select: { title: true } }, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const subscriptionByUser = new Map<string, (typeof subscriptions)[number]>();
  subscriptions.forEach((subscription) => {
    if (!subscriptionByUser.has(subscription.userId)) subscriptionByUser.set(subscription.userId, subscription);
  });

  const productStats = new Map<string, { productId: string; title: string; type: string; sold: number; rows: Array<{ amount: number; currency: string }> }>();
  const buyerStats = new Map<string, { id: string; name: string; email: string; itemsBought: number; orders: number }>();

  orders.forEach((order) => {
    const currentBuyer = buyerStats.get(order.user.id) ?? {
      id: order.user.id,
      name: buyerName(order.user),
      email: order.user.email,
      itemsBought: 0,
      orders: 0,
    };
    currentBuyer.orders += 1;

    order.items.forEach((item) => {
      currentBuyer.itemsBought += item.quantity;
      const currentProduct = productStats.get(item.productId) ?? {
        productId: item.productId,
        title: item.titleSnapshot || item.product.title,
        type: item.product.type,
        sold: 0,
        rows: [],
      };
      currentProduct.sold += item.quantity;
      currentProduct.rows.push({ amount: item.totalAmount, currency: order.currency });
      productStats.set(item.productId, currentProduct);
    });
    buyerStats.set(order.user.id, currentBuyer);
  });

  const transactions: CmsSalesTransaction[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.number,
    occurredAt: (order.paidAt ?? order.createdAt).toISOString(),
    student: {
      id: order.user.id,
      name: buyerName(order.user),
      email: order.user.email,
      purchaseStatus: subscriptionLabel(subscriptionByUser.get(order.user.id)),
    },
    items: order.items.map((item) => ({
      id: item.id,
      title: item.titleSnapshot || item.product.title,
      type: item.product.type,
      quantity: item.quantity,
      totalAmount: item.totalAmount,
    })),
    purchaseType: purchaseType(order),
    amount: order.totalAmount,
    currency: order.currency,
    status: order.status,
    provider: order.provider,
    paymentMethod: order.payments[0]?.paymentMethod ?? null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    filters,
    metrics: {
      itemsSold: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
      uniqueStudents: buyerIds.length,
      revenueByCurrency: sumByCurrency(orders.map((order) => ({ amount: order.totalAmount, currency: order.currency }))),
      previousItemsSold: previousOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
      previousUniqueStudents: new Set(previousOrders.map((order) => order.user.id)).size,
      previousRevenueByCurrency: sumByCurrency(previousOrders.map((order) => ({ amount: order.totalAmount, currency: order.currency }))),
    },
    products,
    productRanking: [...productStats.values()]
      .map((product) => ({ ...product, revenueByCurrency: sumByCurrency(product.rows) }))
      .sort((left, right) => right.sold - left.sold || left.title.localeCompare(right.title)),
    buyerRanking: [...buyerStats.values()]
      .map((buyer) => ({ ...buyer, purchaseStatus: subscriptionLabel(subscriptionByUser.get(buyer.id)) }))
      .sort((left, right) => right.itemsBought - left.itemsBought || right.orders - left.orders || left.name.localeCompare(right.name)),
    transactions,
    activity: transactions.slice(0, 8).map((transaction) => ({
      id: transaction.id,
      studentName: transaction.student.name,
      productTitle: transaction.items.map((item) => item.title).join(", "),
      occurredAt: transaction.occurredAt,
      provider: transaction.provider,
      paymentMethod: transaction.paymentMethod,
      currency: transaction.currency,
      amount: transaction.amount,
    })),
  };
}
