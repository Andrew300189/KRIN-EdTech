import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCourseCategorySchema } from "@/modules/courses/schemas/content.schemas";
import { updateCourseCategory } from "@/modules/courses/services/content.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const category = await updateCourseCategory(guard.user.id, (await params).categoryId, createCourseCategorySchema.partial().parse(await request.json()));
    return NextResponse.json({ data: category });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid category data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update category" }, { status: 400 });
  }
}
