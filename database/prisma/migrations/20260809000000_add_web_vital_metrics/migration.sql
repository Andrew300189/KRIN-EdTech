CREATE TABLE "WebVitalMetric" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION,
    "rating" TEXT NOT NULL,
    "navigationType" TEXT,
    "pagePath" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebVitalMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebVitalMetric_metricId_key" ON "WebVitalMetric"("metricId");
CREATE INDEX "WebVitalMetric_name_createdAt_idx" ON "WebVitalMetric"("name", "createdAt");
CREATE INDEX "WebVitalMetric_pagePath_createdAt_idx" ON "WebVitalMetric"("pagePath", "createdAt");
CREATE INDEX "WebVitalMetric_rating_createdAt_idx" ON "WebVitalMetric"("rating", "createdAt");

ALTER TABLE "WebVitalMetric"
ADD CONSTRAINT "WebVitalMetric_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
