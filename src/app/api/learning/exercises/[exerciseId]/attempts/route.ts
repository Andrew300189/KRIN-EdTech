import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { submitExerciseAttempt } from "@/modules/courses/services/content.service";
import { consumeRateLimit } from "@/core/server/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { exerciseId } = await params;
  const rateLimit = consumeRateLimit(`exercise-attempt:${guard.user.id}:${exerciseId}`, 12, 60_000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  try {
    const result = await submitExerciseAttempt(guard.user.id, exerciseId, await request.json());
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid exercise attempt", issues: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unable to submit exercise";
    return NextResponse.json({ error: message }, { status: message.includes("access") ? 403 : 400 });
  }
}
