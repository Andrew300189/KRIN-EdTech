import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { updateModuleSchema } from "@/modules/courses/schemas/content.schemas";
import { updateCmsCourseModule } from "@/modules/cms/services/module-operations.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const courseModule = await updateCmsCourseModule(guard.user.id, (await params).moduleId, updateModuleSchema.parse(await request.json()));
    return NextResponse.json({ data: courseModule });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid module data." }, { status: 400 });
    const message = error instanceof Error && error.message.includes("Record to update not found") ? "Module not found." : "Unable to update module.";
    return NextResponse.json({ error: message }, { status: message === "Module not found." ? 404 : 400 });
  }
}
