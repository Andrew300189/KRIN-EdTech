import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";

type Tx = Prisma.TransactionClient;

const planRank: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2, PRO: 3, CORPORATE: 3 };
const isActive = (endsAt: Date | null, status: string, now = new Date()) => status === "ACTIVE" && (!endsAt || endsAt > now);

function periodEnd(start: Date, period: "NONE" | "MONTH" | "QUARTER" | "SEMI_ANNUAL" | "YEAR") {
  const end = new Date(start);
  if (period === "YEAR") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else if (period === "SEMI_ANNUAL") end.setUTCMonth(end.getUTCMonth() + 6);
  else if (period === "QUARTER") end.setUTCMonth(end.getUTCMonth() + 3);
  else if (period === "MONTH") end.setUTCMonth(end.getUTCMonth() + 1);
  return period === "NONE" ? null : end;
}

async function createEntitlement(tx: Tx, data: Prisma.EntitlementUncheckedCreateInput) {
  const existing = await tx.entitlement.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
  return existing ?? tx.entitlement.create({ data });
}

async function grantProduct(tx: Tx, input: { userId: string; orderId: string; paymentId: string; provider: "STRIPE" | "LIQPAY"; item: { id: string; product: { id: string; type: "SUBSCRIPTION_PLAN" | "COURSE" | "COURSE_BUNDLE" | "MODULE" | "LESSON_PACK"; planId: string | null; courseId: string | null; moduleId: string | null; plan: { id: string; code: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE"; trialDays: number } | null; bundleItems: { includedProduct: { id: string; type: "SUBSCRIPTION_PLAN" | "COURSE" | "COURSE_BUNDLE" | "MODULE" | "LESSON_PACK"; courseId: string | null; moduleId: string | null } }[] }; productPrice: { billingPeriod: "NONE" | "MONTH" | "QUARTER" | "SEMI_ANNUAL" | "YEAR" } }; now: Date }) {
  const { product, productPrice } = input.item;
  if (product.type === "SUBSCRIPTION_PLAN" && product.plan) {
    const end = periodEnd(input.now, productPrice.billingPeriod);
    const subscription = await tx.subscription.upsert({
      where: { sourcePaymentId: input.paymentId },
      create: { userId: input.userId, provider: input.provider, sourcePaymentId: input.paymentId, plan: product.plan.code, planId: product.plan.id, status: product.plan.trialDays > 0 ? "TRIALING" : "ACTIVE", currentPeriodStart: input.now, currentPeriodEnd: end, trialStartsAt: product.plan.trialDays > 0 ? input.now : null, trialEndsAt: product.plan.trialDays > 0 ? new Date(input.now.getTime() + product.plan.trialDays * 86_400_000) : null },
      update: { plan: product.plan.code, planId: product.plan.id, status: "ACTIVE", currentPeriodStart: input.now, currentPeriodEnd: end },
    });
    await createEntitlement(tx, { userId: input.userId, type: "SUBSCRIPTION", sourceType: "ORDER_ITEM", sourceId: input.item.id, idempotencyKey: `entitlement:${input.orderId}:${input.item.id}`, orderId: input.orderId, subscriptionId: subscription.id, planId: product.plan.id, status: "ACTIVE", startsAt: input.now, endsAt: end });
    await tx.user.update({ where: { id: input.userId }, data: { subscriptionPlan: product.plan.code, subscriptionStatus: subscription.status, subscriptionCurrentPeriodEnd: end } });
    return;
  }

  const products = product.type === "COURSE_BUNDLE" ? product.bundleItems.map((item) => item.includedProduct) : [product];
  for (const granted of products) {
    const type = granted.type === "MODULE" || granted.type === "LESSON_PACK" ? "MODULE" : "COURSE";
    await createEntitlement(tx, { userId: input.userId, type, sourceType: "ORDER_ITEM", sourceId: `${input.item.id}:${granted.id}`, idempotencyKey: `entitlement:${input.orderId}:${input.item.id}:${granted.id}`, orderId: input.orderId, courseId: granted.courseId, moduleId: granted.moduleId, status: "ACTIVE", startsAt: input.now });
    if (granted.courseId) await tx.coursePurchase.upsert({ where: { userId_courseId_orderId: { userId: input.userId, courseId: granted.courseId, orderId: input.orderId } }, create: { userId: input.userId, courseId: granted.courseId, orderId: input.orderId, paymentId: input.paymentId, status: "ACTIVE", accessStartsAt: input.now }, update: { paymentId: input.paymentId, status: "ACTIVE", accessStartsAt: input.now, revokedAt: null } });
  }
}

export async function grantEntitlementsForOrder(tx: Tx, orderId: string, paymentId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { productPrice: true, product: { include: { plan: true, bundleItems: { include: { includedProduct: true } } } } } } } });
  if (!order) throw new Error("Order not found.");
  const now = new Date();
  for (const item of order.items) await grantProduct(tx, { userId: order.userId, orderId, paymentId, provider: order.provider, item, now });
  return order;
}

export async function revokeOrderEntitlements(tx: Tx, orderId: string, reason: string) {
  const now = new Date();
  await tx.entitlement.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: now, metadata: { reason } } });
  await tx.coursePurchase.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "REFUNDED", revokedAt: now } });
}

export async function expireEntitlements(now = new Date()) {
  return prisma.entitlement.updateMany({ where: { status: "ACTIVE", endsAt: { lte: now } }, data: { status: "EXPIRED" } });
}

export async function hasFeatureAccess(userId: string, featureCode: string, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { allowed: false, limitValue: null };
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "CONTENT_MANAGER") return { allowed: true, limitValue: null };
  const entitlement = await prisma.entitlement.findFirst({ where: { userId, type: "SUBSCRIPTION", status: "ACTIVE", startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], plan: { features: { some: { feature: { code: featureCode }, enabled: true } } } }, include: { plan: { include: { features: { where: { feature: { code: featureCode }, enabled: true }, take: 1 } } } } });
  return { allowed: Boolean(entitlement), limitValue: entitlement?.plan?.features[0]?.limitValue ?? null };
}

export async function hasCourseEntitlement(userId: string, courseId: string, now = new Date()) {
  const direct = await prisma.entitlement.findFirst({ where: { userId, status: "ACTIVE", startsAt: { lte: now }, AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, { OR: [{ courseId }, { module: { is: { courseId } } }] }] }, select: { id: true } });
  if (direct) return true;
  const [course, subscription] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { accessPlan: true } }),
    prisma.entitlement.findFirst({ where: { userId, type: "SUBSCRIPTION", status: "ACTIVE", startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], plan: { isNot: null } }, include: { plan: { select: { code: true } } } }),
  ]);
  if (!course || !subscription?.plan) return false;
  return planRank[subscription.plan.code] >= planRank[course.accessPlan];
}

export { periodEnd };
