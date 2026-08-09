-- Persisted search analytics: event history and privacy-safe aggregate metrics.

CREATE TABLE IF NOT EXISTS "SearchHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "resultCount" INTEGER,
  "tookMs" INTEGER,
  "resultType" TEXT,
  "resultId" TEXT,
  "resultUrl" TEXT,
  "position" INTEGER,
  "locale" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SearchQueryMetric" (
  "id" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "context" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "totalSearches" INTEGER NOT NULL DEFAULT 0,
  "noResultSearches" INTEGER NOT NULL DEFAULT 0,
  "totalClicks" INTEGER NOT NULL DEFAULT 0,
  "lastResultCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchQueryMetric_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "SearchHistory"
    ADD CONSTRAINT "SearchHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "SearchQueryMetric_day_context_queryHash_key"
  ON "SearchQueryMetric" ("day", "context", "queryHash");

CREATE INDEX IF NOT EXISTS "SearchHistory_createdAt_idx"
  ON "SearchHistory" ("createdAt");

CREATE INDEX IF NOT EXISTS "SearchHistory_context_createdAt_idx"
  ON "SearchHistory" ("context", "createdAt");

CREATE INDEX IF NOT EXISTS "SearchHistory_queryHash_createdAt_idx"
  ON "SearchHistory" ("queryHash", "createdAt");

CREATE INDEX IF NOT EXISTS "SearchHistory_userId_createdAt_idx"
  ON "SearchHistory" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SearchQueryMetric_day_context_idx"
  ON "SearchQueryMetric" ("day", "context");

CREATE INDEX IF NOT EXISTS "SearchQueryMetric_queryHash_day_idx"
  ON "SearchQueryMetric" ("queryHash", "day");
