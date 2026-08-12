import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getExtraPracticeExercise } from "@/modules/courses/services/content.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: "Sign in to continue with extra practice." }, { status: 401 });
  const { exerciseId } = await params;
  const limit = consumeRateLimit(`exercise-extra:${guard.user.id}:${exerciseId}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many extra-practice requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const exercise = await getExtraPracticeExercise(guard.user.id, exerciseId);
    return NextResponse.json({ data: exercise });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare extra practice.";
    return NextResponse.json({ error: message }, { status: /access|sign in/i.test(message) ? 403 : 400 });
  }
}
