import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/server/session";
import { SEARCH_CONTEXTS, type SearchContext } from "@/modules/search/types";
import { listUserSearchHistory } from "@/modules/search/services/search-analytics.service";

export const runtime = "nodejs";

function parseContext(value: string | null): SearchContext | undefined {
  if (!value) return undefined;
  if (SEARCH_CONTEXTS.includes(value as SearchContext))
    return value as SearchContext;
  return undefined;
}

function parseEventType(value: string | null): "QUERY" | "CLICK" | undefined {
  if (value === "QUERY" || value === "CLICK") return value;
  return undefined;
}

function parseLimit(value: string | null) {
  const numeric = Number(value ?? 20);
  if (!Number.isFinite(numeric)) return 20;
  return Math.max(1, Math.min(100, Math.floor(numeric)));
}

function parseCursor(value: string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

export async function GET(request: NextRequest) {
  try {
    const authenticated = await requireAuth({ headers: request.headers });
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await listUserSearchHistory({
      userId: authenticated.user.id,
      cursor: parseCursor(request.nextUrl.searchParams.get("cursor")),
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
      context: parseContext(request.nextUrl.searchParams.get("context")),
      eventType: parseEventType(request.nextUrl.searchParams.get("eventType")),
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Unable to read search history" },
      { status: 500 },
    );
  }
}
