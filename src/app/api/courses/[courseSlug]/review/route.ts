import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { COURSE_REVIEW_ACCESS_ERROR, getCourseReviewEligibility, saveCourseReview } from "@/modules/courses/services/course-review.service";
import { isSameOriginRequest } from "@/modules/payments/services/billing-security";

export const runtime = "nodejs";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating from 1 to 7.").max(7, "Choose a rating from 1 to 7."),
  comment: z.string().trim().min(3, "Write at least 3 characters.").max(2_000, "A comment may contain up to 2,000 characters."),
});

type RouteContext = { params: Promise<{ courseSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { courseSlug } = await params;
  return NextResponse.json({ data: await getCourseReviewEligibility(guard.user.id, courseSlug) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  const { courseSlug } = await params;
  const limiter = consumeRateLimit(`course-review:${guard.user.id}:${courseSlug}`, 10, 60 * 60_000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many comment updates. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
    );
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose 1–7 stars and enter a comment between 3 and 2,000 characters." }, { status: 400 });

  try {
    return NextResponse.json({ data: await saveCourseReview(guard.user.id, courseSlug, parsed.data) });
  } catch (error) {
    if (error instanceof Error && error.message === COURSE_REVIEW_ACCESS_ERROR) {
      return NextResponse.json({ error: COURSE_REVIEW_ACCESS_ERROR }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to save the course comment." }, { status: 500 });
  }
}
