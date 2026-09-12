import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePermission } from "@/core/server/role-guard";
import { createPlayerTeam, getPlayerTeams } from "@/modules/social/services/player-team.service";

function errorResponse(error: unknown) {
  const message = error instanceof ZodError
    ? error.issues[0]?.message ?? "Check the team details and try again."
    : error instanceof Error ? error.message : "Unable to update teams.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getPlayerTeams(guard.user.id) });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await createPlayerTeam(guard.user.id, await request.json()) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
