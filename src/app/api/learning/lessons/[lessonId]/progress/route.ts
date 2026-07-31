import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getLessonProgress, saveLessonProgress } from "@/modules/courses/services/content.service";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const lessonId = (await params).lessonId;
  const access = await canAccessLesson(guard.user.id, lessonId);
  if (!access.allowed) return NextResponse.json({ error: "You cannot access this lesson" }, { status: 403 });
  const progress = await getLessonProgress(guard.user.id, lessonId);
  return NextResponse.json({ data: progress });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const progress = await saveLessonProgress(guard.user.id, (await params).lessonId, await request.json());
    return NextResponse.json({ data: progress });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid progress data", issues: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unable to save progress";
    return NextResponse.json({ error: message }, { status: message.includes("access") ? 403 : 400 });
  }
}
