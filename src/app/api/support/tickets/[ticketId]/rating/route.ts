import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateSupportTicket } from "@/modules/communications/services/support.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("ticket-rating", guard.user.id, 5, 60 * 60_000)) return NextResponse.json({ error: "Too many rating attempts." }, { status: 429 });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid rating." }, { status: 400 });
  try { return NextResponse.json({ rating: await rateSupportTicket({ ticketId: (await params).ticketId, userId: guard.user.id, ...value.data }) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save rating." }, { status: 400 }); }
}
