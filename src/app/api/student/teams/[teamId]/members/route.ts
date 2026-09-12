import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePermission } from "@/core/server/role-guard";
import {
  invitePlayerToTeam,
  leavePlayerTeam,
  removePlayerFromTeam,
  respondToPlayerTeamInvitation,
} from "@/modules/social/services/player-team.service";

function errorResponse(error: unknown) {
  const message = error instanceof ZodError
    ? error.issues[0]?.message ?? "Check the invitation details and try again."
    : error instanceof Error ? error.message : "Unable to update this team.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await invitePlayerToTeam(guard.user.id, (await params).teamId, await request.json()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await respondToPlayerTeamInvitation(guard.user.id, (await params).teamId, await request.json()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const value = await request.json().catch(() => ({})) as { userId?: unknown; action?: unknown };
    const teamId = (await params).teamId;
    if (value.action === "leave") return NextResponse.json({ data: await leavePlayerTeam(guard.user.id, teamId) });
    if (typeof value.userId !== "string") return NextResponse.json({ error: "Choose a player to remove." }, { status: 400 });
    return NextResponse.json({ data: await removePlayerFromTeam(guard.user.id, teamId, value.userId) });
  } catch (error) {
    return errorResponse(error);
  }
}
