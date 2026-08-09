import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsContentSlotUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { updateCmsContentSlot } from "@/modules/cms/services/content-slot.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsContentSlotUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid content slot update." }, { status: 400 });
  try {
    return NextResponse.json({ data: await updateCmsContentSlot(guard.user.id, (await params).slotId, parsed.data) });
  } catch {
    return NextResponse.json({ error: "Content slot not found." }, { status: 404 });
  }
}
