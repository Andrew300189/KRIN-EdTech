import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { LILY_FACT_CONTEXTS, requestLilyFact } from "@/modules/motivation/services/lily-facts.service";

const querySchema = z.object({ context: z.enum(LILY_FACT_CONTEXTS).default("CLICK") });

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  // A fresh fact is available on every intentional click. Keep only a broad
  // abuse guard; normal reading and closing/reopening the mascot must not hit
  // a visible cooldown.
  const limit = consumeRateLimit(`lily-fact:${guard.user.id}`, 120, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many fact requests. Please try again in a moment." }, { status: 429 });

  try {
    const { context } = querySchema.parse({ context: request.nextUrl.searchParams.get("context") ?? undefined });
    return NextResponse.json({ data: await requestLilyFact(guard.user.id, context) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to find a fact." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`fact-click:${guard.user.id}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many fact requests. Please try again in a moment." }, { status: 429 });
  try {
    return NextResponse.json({ data: await requestLilyFact(guard.user.id, "CLICK", true) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to find a fact." }, { status: 400 });
  }
}
