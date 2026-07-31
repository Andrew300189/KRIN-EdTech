import { NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireLearningUser();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const courses = await listLearnerCourses(guard.user.id);
    return NextResponse.json({ data: courses }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to load your courses right now." },
      { status: 500 },
    );
  }
}
