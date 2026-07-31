import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { createLearningGroup, listTeacherGroups } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("teacher:groups", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listTeacherGroups(guard.user.id) });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("teacher:groups", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string") return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  try {
    const group = await createLearningGroup(guard.user.id, {
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
      timeZone: typeof body.timeZone === "string" ? body.timeZone : undefined,
      maxStudents: typeof body.maxStudents === "number" ? body.maxStudents : undefined,
      activate: body.activate === true,
    });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create group." }, { status: 400 });
  }
}
