import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getCmsLiveOverview } from "@/modules/cms/services/cms-live-overview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const response = NextResponse.json({ data: await getCmsLiveOverview() });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
