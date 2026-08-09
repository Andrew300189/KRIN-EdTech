import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/server/auth";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { SEARCH_CONTEXTS, SEARCH_RESULT_TYPES, type SearchContext, type SearchResultType } from "@/modules/search/types";
import { normalizeSearchQuery } from "@/modules/search/utils/normalize-query";
import { recordSearchResultClick } from "@/modules/search/services/search-analytics.service";

export const runtime = "nodejs";

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

function parseContext(value: unknown): SearchContext {
  if (typeof value === "string" && SEARCH_CONTEXTS.includes(value as SearchContext)) {
    return value as SearchContext;
  }
  return "PUBLIC";
}

function parseResultType(value: unknown): SearchResultType | null {
  if (typeof value !== "string") return null;
  return SEARCH_RESULT_TYPES.includes(value as SearchResultType) ? (value as SearchResultType) : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const rate = consumeRateLimit(user?.id ? `search-click:user:${user.id}` : `search-click:ip:${clientIp(request)}`, user ? 240 : 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests", retryAfter: rate.retryAfterSeconds }, { status: 429 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const query = normalizeSearchQuery(String(body?.query ?? ""));
    const context = parseContext(body?.context);
    const resultType = parseResultType(body?.resultType);
    const resultId = typeof body?.resultId === "string" ? body.resultId.trim() : "";
    const resultUrl = typeof body?.resultUrl === "string" ? body.resultUrl.trim() : "";
    const positionRaw = Number(body?.position ?? -1);
    const position = Number.isFinite(positionRaw) ? Math.max(0, Math.floor(positionRaw)) : -1;

    if (!query || !resultType || !resultId || !resultUrl || position < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await recordSearchResultClick({
      query,
      context,
      resultType,
      resultId,
      resultUrl,
      position,
      locale: user?.interfaceLanguage ?? null,
      userId: user?.id ?? null,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    }).catch(() => {
      console.warn("search_click_analytics_persist_failed");
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unable to persist click" }, { status: 500 });
  }
}
