import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { getCurrentSubscriptionAccess } from "@/modules/payments/services/subscription-access";
import { refreshSubscriptionAccessCookie } from "@/modules/payments/services/subscription-cookie";
import { cancelSubscription } from "@/modules/payments/services/payment.service";
import { consumeBillingAttempt, isSameOriginRequest } from "@/modules/payments/services/billing-security";

export const runtime = "nodejs";

export async function GET() {
  const access = await getCurrentSubscriptionAccess();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await refreshSubscriptionAccessCookie(access.user);
  const currentSubscription = await prisma.subscription.findFirst({
    where: { userId: access.user.id },
    orderBy: [{ currentPeriodEnd: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      provider: true,
      providerPriceId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });
  return NextResponse.json({
    plan: access.user.subscriptionPlan,
    status: access.user.subscriptionStatus,
    currentPeriodEnd: access.user.subscriptionCurrentPeriodEnd,
    hasPremiumAccess: access.hasPremiumAccess,
    hasBillingPortal: Boolean(access.user.stripeCustomerId),
    provider: currentSubscription?.provider ?? null,
    subscriptionId: currentSubscription?.id ?? null,
    providerPriceId: currentSubscription?.providerPriceId ?? null,
    cancelAtPeriodEnd: currentSubscription?.cancelAtPeriodEnd ?? false,
  });
}

const cancellationSchema = z.object({ subscriptionId: z.string().cuid() });

export async function POST(request: NextRequest) {
  const access = await getCurrentSubscriptionAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!consumeBillingAttempt("cancel-subscription", access.user.id)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = cancellationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });
  try { return NextResponse.json({ subscription: await cancelSubscription(access.user.id, parsed.data.subscriptionId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel subscription." }, { status: 400 }); }
}
