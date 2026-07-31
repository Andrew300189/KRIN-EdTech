import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { updateCourseSchema } from "@/modules/courses/schemas/content.schemas";
import { getManagedCourse, updateCourse } from "@/modules/courses/services/content.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { courseId } = await params;
  const course = await getManagedCourse(courseId);
  return course ? NextResponse.json({ data: course }) : NextResponse.json({ error: "Course not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { courseId } = await params;
    const input = updateCourseSchema.parse(await request.json());
    const course = await updateCourse(guard.user.id, courseId, input);
    return NextResponse.json({ data: course });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid course data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update course" }, { status: 400 });
  }
}
