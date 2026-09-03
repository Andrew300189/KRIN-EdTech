import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import {
  completeSpacedLessonReview,
  getSpacedLessonReview,
  startSpacedLessonReview,
} from "@/modules/courses/services/spaced-review.service";

async function guardLesson(request: NextRequest, lessonId: string) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return guard;
  const access = await canAccessLesson(guard.user.id, lessonId);
  return access.allowed ? guard : { ok: false as const, status: 403, error: "You cannot access this lesson." };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const guard = await guardLesson(request, lessonId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getSpacedLessonReview(guard.user.id, lessonId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const guard = await guardLesson(request, lessonId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await startSpacedLessonReview(guard.user.id, lessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare the review." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const guard = await guardLesson(request, lessonId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await completeSpacedLessonReview(guard.user.id, lessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete the review." }, { status: 400 });
  }
}
