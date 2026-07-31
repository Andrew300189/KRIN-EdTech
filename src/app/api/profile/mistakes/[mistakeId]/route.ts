import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { resolveUserMistake } from "@/modules/courses/services/content.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ mistakeId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const result = await resolveUserMistake(guard.user.id, (await params).mistakeId);
  return result.count === 1 ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Mistake not found" }, { status: 404 });
}
