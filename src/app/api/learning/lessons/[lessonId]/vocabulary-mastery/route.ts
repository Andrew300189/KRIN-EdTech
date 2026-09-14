import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import {
  getCourseVocabularyMasteryState,
  submitCourseVocabularyMasteryAttempt,
} from "@/modules/vocabulary/services/course-vocabulary-mastery.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const state = await getCourseVocabularyMasteryState(guard.user.id, (await params).lessonId);
    return NextResponse.json({ data: state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load vocabulary mastery";
    return NextResponse.json({ error: message }, { status: message.includes("cannot access") || message.includes("Premium") ? 403 : 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const result = await submitCourseVocabularyMasteryAttempt(guard.user.id, (await params).lessonId, await request.json());
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary answer", issues: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unable to check vocabulary answer";
    return NextResponse.json({ error: message }, { status: message.includes("cannot access") || message.includes("Premium") ? 403 : 400 });
  }
}
