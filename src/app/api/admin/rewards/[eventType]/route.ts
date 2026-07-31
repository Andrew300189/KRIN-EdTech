import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { updateRewardRule } from "@/modules/motivation/services/motivation.service";

const valid = new Set(["EXERCISE_CORRECT", "LESSON_COMPLETED", "HOMEWORK_COMPLETED", "VOCABULARY_REVIEW", "VOCABULARY_SESSION_COMPLETED", "WARM_UP_COMPLETED", "DAILY_GOAL", "COURSE_COMPLETED"]);
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventType: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const eventType = (await params).eventType;
  if (!valid.has(eventType)) return NextResponse.json({ error: "Unknown reward event" }, { status: 404 });
  try { return NextResponse.json({ data: await updateRewardRule(guard.user.id, eventType as never, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid reward rule", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update rule" }, { status: 400 }); }
}
