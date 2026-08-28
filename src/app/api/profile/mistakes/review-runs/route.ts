import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { hasUnresolvedMistakesForReview, startMistakeReviewRun } from "@/modules/courses/services/mistake-review.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const courseSlug = request.nextUrl.searchParams.get("courseSlug")?.trim();
  const lessonSlug = request.nextUrl.searchParams.get("lessonSlug")?.trim();
  if ((courseSlug && !lessonSlug) || (!courseSlug && lessonSlug)) {
    return NextResponse.json({ error: "A course and lesson are required together." }, { status: 400 });
  }

  const hasUnresolvedMistakes = await hasUnresolvedMistakesForReview(
    guard.user.id,
    courseSlug && lessonSlug ? { courseSlug, lessonSlug } : undefined,
  );
  return NextResponse.json({ data: { hasUnresolvedMistakes } });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null) as { scope?: unknown; courseSlug?: unknown; lessonSlug?: unknown; startMistakeId?: unknown; afterLessonSlug?: unknown } | null;
  if (!body || (body.scope !== "ALL" && body.scope !== "COURSE")) return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  if (body.courseSlug !== undefined && typeof body.courseSlug !== "string") return NextResponse.json({ error: "Invalid course." }, { status: 400 });
  if (body.lessonSlug !== undefined && typeof body.lessonSlug !== "string") return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  if (body.lessonSlug && (!body.courseSlug || body.scope !== "COURSE")) return NextResponse.json({ error: "A lesson review requires its course." }, { status: 400 });
  if (body.startMistakeId !== undefined && typeof body.startMistakeId !== "string") return NextResponse.json({ error: "Invalid mistake." }, { status: 400 });
  if (body.afterLessonSlug !== undefined && typeof body.afterLessonSlug !== "string") return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  try {
    const review = await startMistakeReviewRun(guard.user.id, {
      scope: body.scope,
      courseSlug: body.courseSlug,
      lessonSlug: body.lessonSlug,
      startMistakeId: body.startMistakeId,
      afterLessonSlug: body.afterLessonSlug,
    });
    return NextResponse.json({ data: review });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start review." }, { status: 400 });
  }
}
