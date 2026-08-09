import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsContentSlotSchema } from "@/modules/cms/schemas/content-management.schemas";
import { createCmsContentSlot, listManagedCmsContentSlots } from "@/modules/cms/services/content-slot.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listManagedCmsContentSlots() });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsContentSlotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid content slot." }, { status: 400 });
  try {
    return NextResponse.json({ data: await createCmsContentSlot(guard.user.id, parsed.data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A content slot with this key already exists." }, { status: 409 });
  }
}
