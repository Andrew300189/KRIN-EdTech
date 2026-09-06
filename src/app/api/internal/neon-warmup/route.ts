import { prisma } from "@/core/server/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 5;

const noStoreHeaders = { "Cache-Control": "no-store" };

/**
 * Optional, deliberately disabled-by-default Neon warm-up endpoint.
 * It is protected for Vercel Cron and never reports database configuration.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  if (process.env.NEON_WARMUP_ENABLED !== "true") {
    return NextResponse.json({ ok: true, enabled: false }, { headers: noStoreHeaders });
  }

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, enabled: true, latencyMs: Date.now() - startedAt },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
