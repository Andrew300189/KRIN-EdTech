import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { createModuleSchema } from "@/modules/courses/schemas/content.schemas";
import { createCourseModule, getManagedCourse } from "@/modules/courses/services/content.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const course = await getManagedCourse((await params).courseId);
  return course ? NextResponse.json({ data: course.modules }) : NextResponse.json({ error: "Course not found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = createModuleSchema.parse(await request.json());
    const courseModule = await createCourseModule(guard.user.id, (await params).courseId, input);
    return NextResponse.json({ data: courseModule }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid module data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create module" }, { status: 400 });
  }
}
