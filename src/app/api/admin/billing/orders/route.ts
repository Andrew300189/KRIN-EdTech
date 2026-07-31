import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { isPaymentProvider } from "@/modules/payments/types/payment-provider.types";

export async function GET(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const provider = request.nextUrl.searchParams.get("provider") || undefined;
  const email = request.nextUrl.searchParams.get("email") || undefined;
  if (provider && !isPaymentProvider(provider)) return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  const selectedProvider = provider && isPaymentProvider(provider) ? provider : undefined;
  const orders = await prisma.order.findMany({ where: { ...(status ? { status: status as never } : {}), ...(selectedProvider ? { provider: selectedProvider } : {}), ...(email ? { user: { email: { contains: email, mode: "insensitive" } } } : {}) }, include: { user: { select: { email: true, name: true } }, items: { select: { titleSnapshot: true } }, payments: { select: { id: true, status: true, provider: true, amount: true } }, entitlements: { select: { id: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ orders });
}
