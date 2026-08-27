import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/core/server/session";
import { recordFunnelEvent } from "@/modules/analytics/services/funnel.service";
import { savePlacementTestResult } from "@/modules/courses/services/placement-test.service";

export const runtime = "nodejs";

const placementPayloadSchema = z.object({
  results: z.array(z.boolean()).min(1).max(100),
}).strict();

/** Stores only the signed-in learner's own result; course access is not granted here. */
export async function POST(request: NextRequest) {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) return NextResponse.json({ error: "Sign in is required to save this result." }, { status: 401 });

  try {
    const input = placementPayloadSchema.parse(await request.json());
    const result = await savePlacementTestResult(authenticated.user.id, input.results);

    void recordFunnelEvent({
      eventId: `placement-test-complete:${authenticated.user.id}:${result.testedAt.getTime()}`,
      eventType: "PLACEMENT_TEST_COMPLETE",
      pagePath: "/",
      userId: authenticated.user.id,
      levelCode: result.recommendationLevel,
      result: "SUCCEEDED",
    }).catch(() => undefined);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Complete at least one placement-test question before saving your result." }, { status: 400 });
    }
    return NextResponse.json({ error: "We could not save your placement result. Please try again." }, { status: 500 });
  }
}
