import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { createGroupInvitation } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const guard = await requirePermission("teacher:groups", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string") return NextResponse.json({ error: "Learner email is required." }, { status: 400 });
  try {
    const { invitation, token } = await createGroupInvitation(guard.user.id, (await params).groupId, body.email);
    return NextResponse.json({ data: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, acceptPath: `/student/invitations/${token}` } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invitation." }, { status: 400 });
  }
}
