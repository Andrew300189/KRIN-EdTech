import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { isPaymentProvider } from "@/modules/payments/types/payment-provider.types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerValue = request.nextUrl.searchParams.get("provider") || "ALL";
  if (providerValue !== "ALL" && !isPaymentProvider(providerValue)) {
    return NextResponse.json({ error: "Invalid payment provider." }, { status: 400 });
  }

  const payments = await prisma.payment.findMany({
    where: {
      userId: authenticated.user.id,
      ...(providerValue === "ALL" ? {} : { provider: providerValue }),
    },
    orderBy: { createdAt: "desc" },
    take: 25,
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
      order: { select: { number: true, items: { select: { titleSnapshot: true }, take: 1 } } },
    },
  });
  return NextResponse.json({ payments });
}
