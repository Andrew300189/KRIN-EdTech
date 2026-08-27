import { after, NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/server/auth";
import { consumeRateLimit } from "@/core/server/rate-limit";
import {
  DEFAULT_TOTAL_LIMIT,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  SEARCH_CONTEXTS,
  SEARCH_RESULT_TYPES,
  type SearchContext,
  type SearchFilters,
  type SearchSort,
  type SearchResultType,
} from "@/modules/search/types";
import { normalizeSearchQuery } from "@/modules/search/utils/normalize-query";
import {
  SearchService,
  toSearchPrincipal,
} from "@/modules/search/services/search.service";
import { recordSearchQuery } from "@/modules/search/services/search-analytics.service";

export const runtime = "nodejs";

const SORT_OPTIONS = new Set<SearchSort>([
  "relevance",
  "title",
  "newest",
  "recent_activity",
]);

function parseContext(value: string | null): SearchContext {
  if (value && SEARCH_CONTEXTS.includes(value as SearchContext))
    return value as SearchContext;
  return "PUBLIC";
}

function parseTypes(value: string | null): SearchResultType[] | undefined {
  if (!value) return undefined;
  const types = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const filtered = types.filter((item): item is SearchResultType =>
    SEARCH_RESULT_TYPES.includes(item as SearchResultType),
  );
  return filtered.length ? filtered : undefined;
}

function parseLimit(value: string | null) {
  const numeric = Number(value ?? DEFAULT_TOTAL_LIMIT);
  if (!Number.isFinite(numeric)) return DEFAULT_TOTAL_LIMIT;
  return Math.max(1, Math.min(50, Math.floor(numeric)));
}

function parseCursor(value: string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function parseSort(value: string | null): SearchSort {
  if (!value) return "relevance";
  return SORT_OPTIONS.has(value as SearchSort)
    ? (value as SearchSort)
    : "relevance";
}

function baseRateLimitKey(request: NextRequest, userId: string | null) {
  const ip = clientIp(request);
  return userId ? `search:user:${userId}` : `search:ip:${ip}`;
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

function recordSearchAnalyticsLater(input: Parameters<typeof recordSearchQuery>[0]) {
  const persist = async () => {
    await recordSearchQuery(input).catch(() => {
      console.warn("search_analytics_persist_failed");
    });
  };

  try {
    // `after` runs outside the critical response path in a real Route Handler.
    after(persist);
  } catch {
    // Direct route-handler tests have no Next request async context. Running
    // the same operation normally preserves deterministic test coverage.
    void persist();
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const query = normalizeSearchQuery(
      request.nextUrl.searchParams.get("q") ?? "",
    );
    const context = parseContext(request.nextUrl.searchParams.get("context"));
    const rate = consumeRateLimit(
      baseRateLimitKey(request, user?.id ?? null),
      user ? 120 : 80,
      60_000,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rate.retryAfterSeconds },
        { status: 429 },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({
        query,
        context,
        groups: [],
        items: [],
        total: 0,
        cursor: 0,
        nextCursor: null,
        message: "Type at least two characters",
      });
    }

    const filters: SearchFilters = {
      types: parseTypes(request.nextUrl.searchParams.get("types")),
      level: request.nextUrl.searchParams.get("level") || undefined,
      category: request.nextUrl.searchParams.get("category") || undefined,
      language: request.nextUrl.searchParams.get("language") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
      groupId: request.nextUrl.searchParams.get("groupId") || undefined,
      studentId: request.nextUrl.searchParams.get("studentId") || undefined,
      onlyMine: request.nextUrl.searchParams.get("onlyMine") === "1",
    };

    const startedAt = Date.now();
    const response = await SearchService.searchAll({
      principal: toSearchPrincipal({
        userId: user?.id,
        role: user?.role,
        locale: user?.interfaceLanguage,
      }),
      query,
      requestedContext: context,
      filters,
      cursor: parseCursor(request.nextUrl.searchParams.get("cursor")),
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
      sort: parseSort(request.nextUrl.searchParams.get("sort")),
    });

    const tookMs = Date.now() - startedAt;
    // Search telemetry must not delay the visible search response. Next keeps
    // this task alive after responding, so analytics remain reliable without
    // adding a database transaction to every keystroke.
    recordSearchAnalyticsLater({
      query,
      context: response.context,
      resultCount: response.total,
      tookMs,
      locale: user?.interfaceLanguage ?? null,
      userId: user?.id ?? null,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(response);
  } catch {
    console.error("search_failed");
    return NextResponse.json(
      { error: "Unable to perform search" },
      { status: 500 },
    );
  }
}
