import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { listRewardRules } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listRewardRules() });
}
