import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCourseSchema } from "@/modules/courses/schemas/content.schemas";
import { createCourse, listManagedCourses } from "@/modules/courses/services/content.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listManagedCourses() });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = createCourseSchema.parse(await request.json());
    const created = await createCourse(guard.user.id, input);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid course data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create course" }, { status: 400 });
  }
}
