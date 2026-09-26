import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { getLessonAnswerStreak, resolveLessonAnswerStreak } from "@/modules/motivation/services/lesson-answer-streak.service";

async function authorizedLesson(request: NextRequest, params: Promise<{ lessonId: string }>) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return { error: NextResponse.json({ error: guard.error }, { status: guard.status }) };
  const { lessonId } = await params;
  const access = await canAccessLesson(guard.user.id, lessonId);
  if (!access.allowed) return { error: NextResponse.json({ error: "You cannot access this lesson" }, { status: 403 }) };
  return { userId: guard.user.id, lessonId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const access = await authorizedLesson(request, params);
  if (access.error) return access.error;
  return NextResponse.json({ data: await getLessonAnswerStreak(access.userId!, access.lessonId!) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const access = await authorizedLesson(request, params);
  if (access.error) return access.error;
  const limit = consumeRateLimit(`lesson-answer-streak:${access.userId}:${access.lessonId}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== "RESTORE" && body?.action !== "CONTINUE") return NextResponse.json({ error: "Invalid recovery action." }, { status: 400 });
  try {
    return NextResponse.json({ data: await resolveLessonAnswerStreak(access.userId!, access.lessonId!, body.action) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to restore the lesson streak." }, { status: 400 });
  }
}
