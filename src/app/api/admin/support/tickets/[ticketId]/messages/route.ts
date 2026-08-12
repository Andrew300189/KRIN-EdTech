import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSupportMessage } from "@/modules/communications/services/support.service";
import { isSameOriginRequest } from "@/modules/communications/services/communication-security";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const schema = z.object({
  body: z.string().trim().min(1).max(8000),
  internal: z.boolean().default(false),
});
export async function POST(
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
      { error: "Invalid support reply." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      {
        message: await addSupportMessage({
          ticketId: (await params).ticketId,
          actorId: guard.user.id,
          actorIsAgent: true,
          ...value.data,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to post reply.",
      },
      { status: 400 },
    );
  }
}
