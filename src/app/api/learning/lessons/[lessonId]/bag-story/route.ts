import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getBagStoryState, submitBagStoryAttempt } from "@/modules/vocabulary/services/a-bag-story.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const locale = request.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uk";
    return NextResponse.json({ data: await getBagStoryState(guard.user.id, (await params).lessonId, locale) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load lesson";
    return NextResponse.json({ error: message }, { status: message.includes("cannot access") ? 403 : 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await submitBagStoryAttempt(guard.user.id, (await params).lessonId, await request.json()) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unable to check answer";
    return NextResponse.json({ error: message }, { status: message.includes("cannot access") ? 403 : 400 });
  }
}
