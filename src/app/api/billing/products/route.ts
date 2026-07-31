import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { isPaymentProvider } from "@/modules/payments/types/payment-provider.types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const providerValue = request.nextUrl.searchParams.get("provider");
  if (providerValue && !isPaymentProvider(providerValue)) return NextResponse.json({ error: "Invalid payment provider." }, { status: 400 });
  const provider = providerValue && isPaymentProvider(providerValue) ? providerValue : undefined;
  const products = await prisma.product.findMany({
    where: { isActive: true, isPublic: true },
    include: { prices: { where: { isActive: true, ...(provider ? { provider } : {}) }, select: { id: true, provider: true, currency: true, amount: true, billingPeriod: true }, orderBy: [{ provider: "asc" }, { amount: "asc" }] }, plan: { select: { code: true, title: true, description: true, trialDays: true } } },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ products });
}
