import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsContentEntityTypeSchema } from "@/modules/cms/schemas/content-management.schemas";
import { reorderCmsContent } from "@/modules/cms/services/course-operations.service";

const schema = z.object({ orderedIds: z.array(z.string().cuid()).min(1).max(500) });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ entityType: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const type = cmsContentEntityTypeSchema.safeParse((await params).entityType);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!type.success || !input.success) return NextResponse.json({ error: "Invalid ordering request." }, { status: 400 });
  try {
    await reorderCmsContent(guard.user.id, type.data, input.data.orderedIds);
    return NextResponse.json({ data: { orderedIds: input.data.orderedIds } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reorder content." }, { status: 400 });
  }
}
