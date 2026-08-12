import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { openExerciseSolution } from "@/modules/courses/services/content.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: "Sign in to open a solution." }, { status: 401 });
  const { exerciseId } = await params;
  const limit = consumeRateLimit(`exercise-solution:${guard.user.id}:${exerciseId}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many solution requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    return NextResponse.json({ data: await openExerciseSolution(guard.user.id, exerciseId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open the solution.";
    return NextResponse.json({ error: message }, { status: /access|sign in/i.test(message) ? 403 : 400 });
  }
}
