import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { finalizeLessonSessionPerfectStreak } from "@/modules/motivation/services/motivation.service";

const inputSchema = z.object({ learningSessionId: z.string().cuid() });

/**
 * The final "Next" action calls this endpoint. It accepts only the opaque
 * server-issued session id: answer history and First-Time Right totals are
 * calculated on the server from ExerciseAttempt rows.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`lesson-perfect-streak:${guard.user.id}`, 12, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many completion requests. Try again in a minute." }, { status: 429 });

  try {
    const { learningSessionId } = inputSchema.parse(await request.json());
    const { lessonId } = await params;
    return NextResponse.json({ data: await finalizeLessonSessionPerfectStreak(guard.user.id, lessonId, learningSessionId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to finalize the lesson streak." }, { status: 400 });
  }
}
