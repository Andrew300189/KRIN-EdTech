import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { startExerciseSpeedWindow } from "@/modules/courses/services/content.service";
import { consumeRateLimit } from "@/core/server/rate-limit";

/** Starts the server-owned timer that drives the 3 → 1 XP answer band. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { exerciseId } = await params;
  const rateLimit = consumeRateLimit(`exercise-speed-window:${guard.user.id}:${exerciseId}`, 30, 60_000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Please wait before reopening this task." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  try {
    return NextResponse.json({ data: await startExerciseSpeedWindow(guard.user.id, exerciseId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start the answer timer.";
    return NextResponse.json({ error: message }, { status: /access|different learner/i.test(message) ? 403 : 400 });
  }
}
