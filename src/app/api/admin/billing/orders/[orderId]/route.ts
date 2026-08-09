import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const orderId = (await params).orderId;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, name: true } }, items: { include: { product: true, productPrice: true } }, payments: { include: { events: true, refunds: true } }, entitlements: true, purchases: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const auditLog = await prisma.contentAuditLog.findMany({ where: { entityType: { in: ["Order", "Payment", "UserReward"] }, entityId: { in: [order.id, ...order.payments.map((payment) => payment.id)] } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ order, auditLog });
}
