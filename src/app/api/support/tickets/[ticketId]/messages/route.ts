import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSupportMessage } from "@/modules/communications/services/support.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const schema = z.object({ body: z.string().trim().min(1).max(8000) });
export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("ticket-message", guard.user.id, 20, 60 * 60_000)) return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  try { return NextResponse.json({ message: await addSupportMessage({ ticketId: (await params).ticketId, actorId: guard.user.id, actorIsAgent: false, body: value.data.body }) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to post message." }, { status: 400 }); }
}
