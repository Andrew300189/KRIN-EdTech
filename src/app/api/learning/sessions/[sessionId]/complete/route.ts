import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { completeLearningSession } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const result = await completeLearningSession(guard.user.id, (await params).sessionId);
  return result.count ? NextResponse.json({ data: { completed: true } }) : NextResponse.json({ error: "Active learning session not found" }, { status: 404 });
}
