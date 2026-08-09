import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsMediaAssetUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { updateCmsMediaAsset } from "@/modules/cms/services/media.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsMediaAssetUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media update." }, { status: 400 });
  try {
    return NextResponse.json({ data: await updateCmsMediaAsset(guard.user.id, (await params).mediaId, parsed.data) });
  } catch {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }
}
