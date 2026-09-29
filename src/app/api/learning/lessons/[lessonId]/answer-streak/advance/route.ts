import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { carryLessonAnswerStreakToNextLesson } from "@/modules/motivation/services/lesson-answer-streak.service";

const inputSchema = z.object({ nextLessonId: z.string().min(1).max(128) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`lesson-streak-advance:${guard.user.id}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many lesson transitions. Try again in a minute." }, { status: 429 });

  try {
    const { nextLessonId } = inputSchema.parse(await request.json());
    const { lessonId } = await params;
    return NextResponse.json({ data: await carryLessonAnswerStreakToNextLesson(guard.user.id, lessonId, nextLessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to continue the answer streak." }, { status: 400 });
  }
}
