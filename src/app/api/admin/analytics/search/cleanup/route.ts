import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cleanupSearchHistory } from "@/modules/search/services/search-analytics.service";

export const runtime = "nodejs";

const schema = z.object({
  retentionDays: z.number().int().min(30).max(1095).optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePlatformOwner(request);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await cleanupSearchHistory(parsed.data);
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "Unable to cleanup search analytics" }, { status: 500 });
  }
}
