import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { recordLearningHeartbeat } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`learning-heartbeat:${guard.user.id}`, 90, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many heartbeat requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try { return NextResponse.json({ data: await recordLearningHeartbeat(guard.user.id, (await params).sessionId, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid heartbeat", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record heartbeat" }, { status: 400 }); }
}
