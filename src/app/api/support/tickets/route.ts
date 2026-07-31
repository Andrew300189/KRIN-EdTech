import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupportTicket, listUserTickets } from "@/modules/communications/services/support.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const createSchema = z.object({ categoryId: z.string().cuid().optional(), subject: z.string().trim().min(3).max(180), description: z.string().trim().min(5).max(8000), priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(), relatedOrderId: z.string().cuid().optional() });

export async function GET(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json(await listUserTickets(guard.user.id, request.nextUrl.searchParams.get("cursor") || undefined));
}

export async function POST(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("ticket-create", guard.user.id, 5, 60 * 60_000)) return NextResponse.json({ error: "Too many support tickets. Try again later." }, { status: 429 });
  const value = createSchema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid support ticket." }, { status: 400 });
  try { return NextResponse.json({ ticket: await createSupportTicket({ userId: guard.user.id, ...value.data }) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create support ticket." }, { status: 400 }); }
}
