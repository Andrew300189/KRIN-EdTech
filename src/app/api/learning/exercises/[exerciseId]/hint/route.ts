import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { purchaseExerciseHint } from "@/modules/courses/services/content.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: "Sign in to show a hint." }, { status: 401 });

  const { exerciseId } = await params;
  const body = await request.json().catch(() => null) as { automatic?: unknown } | null;
  const limit = consumeRateLimit(`exercise-hint:${guard.user.id}:${exerciseId}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many hint requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  try {
    return NextResponse.json({
      data: await purchaseExerciseHint(guard.user.id, exerciseId, { allowFreeFallback: body?.automatic === true }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to show the hint.";
    return NextResponse.json({ error: message }, { status: /access|sign in|different learner/i.test(message) ? 403 : 400 });
  }
}
