import { createHash, randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { SearchContext, SearchResultType } from "@/modules/search/types";
import { normalizeSearchQuery } from "@/modules/search/utils/normalize-query";

type SearchHistoryEvent = "QUERY" | "CLICK";
let searchAnalyticsTablesReadyPromise: Promise<boolean> | null = null;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function dayBucketUtc(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function normalizeContext(context: SearchContext) {
  return context.toUpperCase();
}

function normalizeQuery(query: string) {
  return normalizeSearchQuery(query).toLocaleLowerCase("en");
}

function isMissingRelationError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2010") return false;
  const metaCode = typeof error.meta?.code === "string" ? error.meta.code : "";
  return metaCode === "42P01";
}

async function hasSearchAnalyticsTables() {
  if (!searchAnalyticsTablesReadyPromise) {
    searchAnalyticsTablesReadyPromise = prisma.$queryRaw<Array<{ historyTable: string | null; metricTable: string | null }>>(
      Prisma.sql`
        SELECT
          to_regclass('"SearchHistory"')::text AS "historyTable",
          to_regclass('"SearchQueryMetric"')::text AS "metricTable"
      `,
    )
      .then((rows) => Boolean(rows[0]?.historyTable && rows[0]?.metricTable))
      .catch(() => false);
  }

  return searchAnalyticsTablesReadyPromise;
}

export async function recordSearchQuery(input: {
  query: string;
  context: SearchContext;
  resultCount: number;
  tookMs: number;
  locale?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!(await hasSearchAnalyticsTables())) return;
  const normalizedQuery = normalizeQuery(input.query);
  if (!normalizedQuery) return;
  const queryHash = hashValue(normalizedQuery);
  const context = normalizeContext(input.context);
  const day = dayBucketUtc();

  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultCount", "tookMs", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${randomUUID()}, ${input.userId ?? null}, 'QUERY', ${input.query}, ${normalizedQuery}, ${queryHash}, ${context},
          ${Math.max(0, Math.floor(input.resultCount))}, ${Math.max(0, Math.floor(input.tookMs))}, ${input.locale ?? null},
          ${input.ip ? hashValue(input.ip) : null}, ${input.userAgent?.slice(0, 512) ?? null}, NOW()
        )
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${day}, ${context}, ${queryHash}, 1,
          ${input.resultCount === 0 ? 1 : 0}, 0, ${Math.max(0, Math.floor(input.resultCount))}, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalSearches" = "SearchQueryMetric"."totalSearches" + 1,
          "noResultSearches" = "SearchQueryMetric"."noResultSearches" + ${input.resultCount === 0 ? 1 : 0},
          "lastResultCount" = ${Math.max(0, Math.floor(input.resultCount))},
          "updatedAt" = NOW()
      `,
    ),
  ]).catch((error: unknown) => {
    if (isMissingRelationError(error)) return;
    throw error;
  });
}

export async function recordSearchResultClick(input: {
  query: string;
  context: SearchContext;
  resultType: SearchResultType;
  resultId: string;
  resultUrl: string;
  position: number;
  locale?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!(await hasSearchAnalyticsTables())) return;
  const normalizedQuery = normalizeQuery(input.query);
  if (!normalizedQuery) return;

  const queryHash = hashValue(normalizedQuery);
  const context = normalizeContext(input.context);
  const day = dayBucketUtc();

  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultType", "resultId", "resultUrl", "position", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${randomUUID()}, ${input.userId ?? null}, 'CLICK', ${input.query}, ${normalizedQuery}, ${queryHash}, ${context},
          ${input.resultType}, ${input.resultId.slice(0, 191)}, ${input.resultUrl.slice(0, 512)}, ${Math.max(0, Math.floor(input.position))},
          ${input.locale ?? null}, ${input.ip ? hashValue(input.ip) : null}, ${input.userAgent?.slice(0, 512) ?? null}, NOW()
        )
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${day}, ${context}, ${queryHash}, 0, 0, 1, 0, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalClicks" = "SearchQueryMetric"."totalClicks" + 1,
          "updatedAt" = NOW()
      `,
    ),
  ]).catch((error: unknown) => {
    if (isMissingRelationError(error)) return;
    throw error;
  });
}

export async function listUserSearchHistory(input: {
  userId: string;
  cursor?: number;
  limit?: number;
  context?: SearchContext;
  eventType?: SearchHistoryEvent;
}) {
  const cursor = Math.max(0, Math.floor(input.cursor ?? 0));
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 20)));
  if (!(await hasSearchAnalyticsTables())) {
    return {
      items: [],
      total: 0,
      cursor,
      nextCursor: null,
    };
  }
  try {
    const conditions: Prisma.Sql[] = [Prisma.sql`"userId" = ${input.userId}`];

    if (input.context) {
      conditions.push(Prisma.sql`"context" = ${normalizeContext(input.context)}`);
    }
    if (input.eventType) {
      conditions.push(Prisma.sql`"eventType" = ${input.eventType}`);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const [countRow] = await prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "SearchHistory"
        ${whereSql}
      `,
    );

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      eventType: SearchHistoryEvent;
      query: string;
      context: string;
      resultCount: number | null;
      resultType: string | null;
      resultId: string | null;
      resultUrl: string | null;
      position: number | null;
      createdAt: Date;
    }>>(
      Prisma.sql`
        SELECT
          "id",
          "eventType",
          "query",
          "context",
          "resultCount",
          "resultType",
          "resultId",
          "resultUrl",
          "position",
          "createdAt"
        FROM "SearchHistory"
        ${whereSql}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
        OFFSET ${cursor}
      `,
    );

    const total = Number(countRow?.count ?? 0);
    const nextCursor = cursor + limit < total ? cursor + limit : null;

    return {
      items: rows,
      total,
      cursor,
      nextCursor,
    };
  } catch (error: unknown) {
    if (isMissingRelationError(error)) {
      return {
        items: [],
        total: 0,
        cursor,
        nextCursor: null,
      };
    }
    throw error;
  }
}

export async function getSearchAnalyticsSummary(input?: { days?: number; context?: SearchContext }) {
  const days = Math.min(365, Math.max(1, Math.floor(input?.days ?? 30)));
  if (!(await hasSearchAnalyticsTables())) {
    return {
      periodDays: days,
      totals: {
        totalSearches: 0,
        totalClicks: 0,
        noResultSearches: 0,
        clickThroughRate: 0,
        noResultRate: 0,
      },
      byContext: [],
      daily: [],
      topQueries: [],
    };
  }
  const start = dayBucketUtc(new Date(Date.now() - (days - 1) * 86_400_000));
  const context = input?.context ? normalizeContext(input.context) : null;
  const contextWhere = context ? Prisma.sql`AND "context" = ${context}` : Prisma.empty;
  const historyContextWhere = context ? Prisma.sql`AND "context" = ${context}` : Prisma.empty;

  try {
    const [totalsRow] = await prisma.$queryRaw<Array<{
    totalSearches: number;
    noResultSearches: number;
    totalClicks: number;
  }>>(
    Prisma.sql`
      SELECT
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${start}
      ${contextWhere}
    `,
  );

    const byContext = await prisma.$queryRaw<Array<{
    context: string;
    totalSearches: number;
    noResultSearches: number;
    totalClicks: number;
  }>>(
    Prisma.sql`
      SELECT
        "context",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${start}
      ${contextWhere}
      GROUP BY "context"
      ORDER BY "totalSearches" DESC
    `,
  );

    const daily = await prisma.$queryRaw<Array<{
    day: Date;
    totalSearches: number;
    totalClicks: number;
    noResultSearches: number;
  }>>(
    Prisma.sql`
      SELECT
        "day",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${start}
      ${contextWhere}
      GROUP BY "day"
      ORDER BY "day" ASC
    `,
  );

    const topQueries = await prisma.$queryRaw<Array<{
    queryHash: string;
    searches: number;
    clicks: number;
    noResults: number;
  }>>(
    Prisma.sql`
      SELECT
        "queryHash",
        COALESCE(SUM("totalSearches"), 0)::int AS searches,
        COALESCE(SUM("totalClicks"), 0)::int AS clicks,
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResults"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${start}
      ${contextWhere}
      GROUP BY "queryHash"
      ORDER BY searches DESC, clicks DESC
      LIMIT 10
    `,
  );

    const topQueryTexts = await prisma.$queryRaw<Array<{
      queryHash: string;
      normalizedQuery: string;
      samples: number;
    }>>(
      Prisma.sql`
        SELECT
          "queryHash",
          "normalizedQuery",
          COUNT(*)::int AS samples
        FROM "SearchHistory"
        WHERE "createdAt" >= ${start}
          AND "eventType" = 'QUERY'
          ${historyContextWhere}
        GROUP BY "queryHash", "normalizedQuery"
        ORDER BY samples DESC
      `,
    );

    const queryByHash = new Map<string, { normalizedQuery: string; samples: number }>();
    for (const row of topQueryTexts) {
      const current = queryByHash.get(row.queryHash);
      if (!current || row.samples > current.samples) {
        queryByHash.set(row.queryHash, { normalizedQuery: row.normalizedQuery, samples: row.samples });
      }
    }

    const totalSearches = Number(totalsRow?.totalSearches ?? 0);
    const totalClicks = Number(totalsRow?.totalClicks ?? 0);
    const noResultSearches = Number(totalsRow?.noResultSearches ?? 0);

    return {
      periodDays: days,
      totals: {
        totalSearches,
        totalClicks,
        noResultSearches,
        clickThroughRate: totalSearches ? Math.round((totalClicks / totalSearches) * 1000) / 10 : 0,
        noResultRate: totalSearches ? Math.round((noResultSearches / totalSearches) * 1000) / 10 : 0,
      },
      byContext: byContext.map((row) => ({
        ...row,
        clickThroughRate: row.totalSearches ? Math.round((row.totalClicks / row.totalSearches) * 1000) / 10 : 0,
        noResultRate: row.totalSearches ? Math.round((row.noResultSearches / row.totalSearches) * 1000) / 10 : 0,
      })),
      daily,
      topQueries: topQueries.map((row) => {
        const bestQuery = queryByHash.get(row.queryHash);
        // K-anonymity style guard: do not show raw query text for sparse queries.
        const query = bestQuery && bestQuery.samples >= 3 ? bestQuery.normalizedQuery : null;
        return {
          ...row,
          query,
          sampleCount: bestQuery?.samples ?? 0,
        };
      }),
    };
  } catch (error: unknown) {
    if (isMissingRelationError(error)) {
      return {
        periodDays: days,
        totals: {
          totalSearches: 0,
          totalClicks: 0,
          noResultSearches: 0,
          clickThroughRate: 0,
          noResultRate: 0,
        },
        byContext: [],
        daily: [],
        topQueries: [],
      };
    }
    throw error;
  }
}

export async function getSearchAnalyticsExport(input?: { days?: number; context?: SearchContext }) {
  const summary = await getSearchAnalyticsSummary(input);
  return {
    generatedAt: new Date().toISOString(),
    periodDays: summary.periodDays,
    totals: summary.totals,
    byContext: summary.byContext,
    daily: summary.daily,
    topQueries: summary.topQueries,
  };
}

export async function cleanupSearchHistory(input?: { retentionDays?: number; dryRun?: boolean }) {
  const retentionDays = Math.min(1095, Math.max(30, Math.floor(input?.retentionDays ?? 180)));
  const dryRun = input?.dryRun ?? false;

  if (!(await hasSearchAnalyticsTables())) {
    return {
      retentionDays,
      dryRun,
      deletedHistoryRows: 0,
      deletedMetricRows: 0,
    };
  }

  const threshold = new Date(Date.now() - retentionDays * 86_400_000);
  const thresholdDay = dayBucketUtc(threshold);

  const [historyCountRow] = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${threshold}
    `,
  );

  const [metricCountRow] = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${thresholdDay}
    `,
  );

  const deletedHistoryRows = Number(historyCountRow?.count ?? 0);
  const deletedMetricRows = Number(metricCountRow?.count ?? 0);

  if (!dryRun) {
    await prisma.$transaction([
      prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM "SearchHistory"
          WHERE "createdAt" < ${threshold}
        `,
      ),
      prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM "SearchQueryMetric"
          WHERE "day" < ${thresholdDay}
        `,
      ),
    ]);
  }

  return {
    retentionDays,
    dryRun,
    deletedHistoryRows,
    deletedMetricRows,
  };
}
