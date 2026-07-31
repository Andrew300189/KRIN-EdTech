import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const schema = z.object({ endpoint: z.string().url().max(2_000), p256dh: z.string().min(16).max(500), auth: z.string().min(8).max(500) });
export async function POST(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  const subscription = await prisma.pushSubscription.upsert({ where: { endpoint: value.data.endpoint }, update: { userId: guard.user.id, p256dh: value.data.p256dh, auth: value.data.auth, userAgent: request.headers.get("user-agent")?.slice(0, 500), isActive: true }, create: { userId: guard.user.id, ...value.data, userAgent: request.headers.get("user-agent")?.slice(0, 500) } });
  return NextResponse.json({ subscription: { id: subscription.id, isActive: subscription.isActive } }, { status: 201 });
}
export async function DELETE(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const endpoint = request.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "Missing subscription endpoint." }, { status: 400 });
  await prisma.pushSubscription.updateMany({ where: { endpoint, userId: guard.user.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
