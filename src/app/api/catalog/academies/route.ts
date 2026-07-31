import { NextResponse } from "next/server";
import {
  COURSE_STAGES,
  LEARNING_ACADEMIES,
} from "@/modules/courses/service";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        academies: LEARNING_ACADEMIES,
        stages: COURSE_STAGES,
      },
    },
    { status: 200 },
  );
}
