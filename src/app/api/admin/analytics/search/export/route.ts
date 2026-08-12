import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { SEARCH_CONTEXTS, type SearchContext } from "@/modules/search/types";
import { getSearchAnalyticsExport } from "@/modules/search/services/search-analytics.service";

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

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

    const dataset = await getSearchAnalyticsExport({
      days: parseDays(request.nextUrl.searchParams.get("days")),
      context: parseContext(request.nextUrl.searchParams.get("context")),
    });

    const lines: string[] = [];
    lines.push(
      "section,context,day,queryHash,query,searches,clicks,noResults,ctr,noResultRate,samples",
    );

    lines.push(
      [
        "totals",
        "ALL",
        "",
        "",
        "",
        dataset.totals.totalSearches,
        dataset.totals.totalClicks,
        dataset.totals.noResultSearches,
        dataset.totals.clickThroughRate,
        dataset.totals.noResultRate,
        "",
      ]
        .map(csvCell)
        .join(","),
    );

    for (const row of dataset.byContext) {
      lines.push(
        [
          "context",
          row.context,
          "",
          "",
          "",
          row.totalSearches,
          row.totalClicks,
          row.noResultSearches,
          row.clickThroughRate,
          row.noResultRate,
          "",
        ]
          .map(csvCell)
          .join(","),
      );
    }

    for (const row of dataset.daily) {
      lines.push(
        [
          "daily",
          "ALL",
          row.day instanceof Date
            ? row.day.toISOString().slice(0, 10)
            : String(row.day),
          "",
          "",
          row.totalSearches,
          row.totalClicks,
          row.noResultSearches,
          "",
          "",
          "",
        ]
          .map(csvCell)
          .join(","),
      );
    }

    for (const row of dataset.topQueries) {
      lines.push(
        [
          "top_query",
          "ALL",
          "",
          row.queryHash,
          row.query ?? "",
          row.searches,
          row.clicks,
          row.noResults,
          "",
          "",
          row.sampleCount ?? 0,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const filename = `search-analytics-${dataset.periodDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to export search analytics" },
      { status: 500 },
    );
  }
}
