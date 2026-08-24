import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { evaluatePublicExerciseAttempt, submitExerciseAttempt } from "@/modules/courses/services/content.service";
import { consumeRateLimit } from "@/core/server/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  const { exerciseId } = await params;
  if (!guard.ok) {
    const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rateLimit = consumeRateLimit(`public-exercise-attempt:${visitor}:${exerciseId}`, 12, 60_000);
    if (!rateLimit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    try {
      return NextResponse.json({ data: await evaluatePublicExerciseAttempt(exerciseId, await request.json()) });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ error: "Invalid exercise attempt", issues: error.issues }, { status: 400 });
      const message = error instanceof Error ? error.message : "Unable to check the answer.";
      return NextResponse.json({ error: message }, { status: /access|unavailable/i.test(message) ? 403 : 400 });
    }
  }
  const rateLimit = consumeRateLimit(`exercise-attempt:${guard.user.id}:${exerciseId}`, 12, 60_000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  try {
    const input = await request.json() as { reviewRunId?: unknown };
    const reviewRunId = typeof input.reviewRunId === "string" && input.reviewRunId ? input.reviewRunId : undefined;
    const result = await submitExerciseAttempt(guard.user.id, exerciseId, input, reviewRunId);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid exercise attempt", issues: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unable to submit exercise";
    return NextResponse.json({ error: message }, { status: message.includes("access") ? 403 : 400 });
  }
}
