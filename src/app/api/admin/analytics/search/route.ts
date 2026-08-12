import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { SEARCH_CONTEXTS, type SearchContext } from "@/modules/search/types";
import { getSearchAnalyticsSummary } from "@/modules/search/services/search-analytics.service";

export const runtime = "nodejs";

function parseContext(value: string | null): SearchContext | undefined {
  if (!value) return undefined;
  if (SEARCH_CONTEXTS.includes(value as SearchContext))
    return value as SearchContext;
  return undefined;
}

function parseDays(value: string | null) {
  const numeric = Number(value ?? 30);
  if (!Number.isFinite(numeric)) return 30;
  return Math.max(1, Math.min(365, Math.floor(numeric)));
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePlatformOwner(request);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.error },
        { status: guard.status },
      );
    }

    const summary = await getSearchAnalyticsSummary({
      days: parseDays(request.nextUrl.searchParams.get("days")),
      context: parseContext(request.nextUrl.searchParams.get("context")),
    });

    return NextResponse.json({ data: summary });
  } catch {
    return NextResponse.json(
      { error: "Unable to read search analytics" },
      { status: 500 },
    );
  }
}
