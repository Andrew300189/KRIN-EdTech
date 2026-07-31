import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { refreshSubscriptionAccessCookie } from "@/modules/payments/services/subscription-cookie";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { paymentId } = await context.params;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: authenticated.user.id },
    select: {
      id: true,
      provider: true,
      plan: true,
      billingPeriod: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      paidAt: true,
      order: { select: { number: true, status: true, items: { select: { titleSnapshot: true, quantity: true, totalAmount: true } } } },
    },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  await refreshSubscriptionAccessCookie(authenticated.user);
  return NextResponse.json({ payment });
}
