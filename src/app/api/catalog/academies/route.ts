import { NextResponse } from "next/server";
import {
  COURSE_STAGES,
  DISCOVERY_COURSES,
  LEARNING_ACADEMIES,
} from "@/modules/courses/service";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        academies: LEARNING_ACADEMIES,
        stages: COURSE_STAGES,
        discoveryCourses: DISCOVERY_COURSES,
      },
    },
    { status: 200 },
  );
}
