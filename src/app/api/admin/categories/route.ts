import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCourseCategorySchema } from "@/modules/courses/schemas/content.schemas";
import { createCourseCategory, listManagedCourseCategories } from "@/modules/courses/services/content.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listManagedCourseCategories() });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const category = await createCourseCategory(guard.user.id, createCourseCategorySchema.parse(await request.json()));
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid category data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create category" }, { status: 400 });
  }
}
