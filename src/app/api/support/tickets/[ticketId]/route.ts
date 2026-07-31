import { NextRequest, NextResponse } from "next/server";
import { getUserTicket } from "@/modules/communications/services/support.service";
import { requireCommunicationUser } from "@/modules/communications/services/communication-security";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ticket = await getUserTicket(guard.user.id, (await params).ticketId);
  return ticket ? NextResponse.json({ ticket }) : NextResponse.json({ error: "Ticket not found." }, { status: 404 });
}
