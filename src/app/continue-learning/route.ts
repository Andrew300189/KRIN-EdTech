import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref, learnerCourseToContinue } from "@/modules/courses/utils/learner-course-path";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.redirect(new URL("/login?next=%2Fcontinue-learning", request.url));
  const courses = await listLearnerCourses(guard.user.id);
  const next = learnerCourseToContinue(courses);
  return NextResponse.redirect(new URL(next ? learnerCourseContinueHref(next) : "/student/catalog", request.url));
}
