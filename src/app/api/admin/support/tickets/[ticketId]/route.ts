import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  changeSupportTicketStatus,
  getAdminTicket,
} from "@/modules/communications/services/support.service";
import { isSameOriginRequest } from "@/modules/communications/services/communication-security";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const schema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_USER",
    "RESOLVED",
    "CLOSED",
  ]),
  note: z.string().trim().max(500).optional(),
});
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok)
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ticket = await getAdminTicket((await params).ticketId);
  return ticket
    ? NextResponse.json({ ticket })
    : NextResponse.json({ error: "Ticket not found." }, { status: 404 });
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok)
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success)
    return NextResponse.json(
      { error: "Invalid ticket update." },
      { status: 400 },
    );
  try {
    return NextResponse.json({
      ticket: await changeSupportTicketStatus({
        ticketId: (await params).ticketId,
        actorId: guard.user.id,
        ...value.data,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update ticket.",
      },
      { status: 400 },
    );
  }
}
