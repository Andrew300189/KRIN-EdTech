import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { createLearningSession } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`learning-session:${guard.user.id}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many session requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try { return NextResponse.json({ data: await createLearningSession(guard.user.id, await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid learning session", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start learning session" }, { status: 400 }); }
}
