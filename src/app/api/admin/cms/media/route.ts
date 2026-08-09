import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsMediaAssetSchema } from "@/modules/cms/schemas/content-management.schemas";
import { createCmsMediaAsset, listManagedCmsMediaAssets } from "@/modules/cms/services/media.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const includeArchived = request.nextUrl.searchParams.get("archived") === "true";
  return NextResponse.json({ data: await listManagedCmsMediaAssets(includeArchived) });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsMediaAssetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media metadata." }, { status: 400 });
  try {
    return NextResponse.json({ data: await createCmsMediaAsset(guard.user.id, parsed.data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This media URL is already registered." }, { status: 409 });
  }
}
