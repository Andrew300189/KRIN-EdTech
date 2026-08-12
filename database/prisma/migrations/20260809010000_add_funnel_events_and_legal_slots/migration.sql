-- Add a dedicated CMS area for legal and trust information. Existing slots
-- remain untouched and continue to use their current areas.
ALTER TYPE "CmsContentArea" ADD VALUE IF NOT EXISTS 'LEGAL';

CREATE TYPE "FunnelEventType" AS ENUM (
  'HOME_VIEW',
  'PLACEMENT_TEST_START',
  'PLACEMENT_TEST_COMPLETE',
  'COURSE_CATALOG_VIEW',
  'COURSE_FILTER_USED',
  'COURSE_VIEW',
  'PREVIEW_LESSON_START',
  'PREVIEW_LESSON_COMPLETE',
  'SIGNUP_START',
  'SIGNUP_COMPLETE',
  'PRICING_VIEW',
  'CHECKOUT_START',
  'CHECKOUT_ERROR',
  'PURCHASE_COMPLETE',
  'FIRST_LESSON_START',
  'FIRST_LESSON_COMPLETE'
);

-- The table is intentionally minimal: no request body, e-mail, address, IP,
-- browser fingerprint, provider token or payment amount is collected.
CREATE TABLE "FunnelEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" "FunnelEventType" NOT NULL,
  "pagePath" TEXT NOT NULL,
  "courseId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FunnelEvent_eventId_key" ON "FunnelEvent"("eventId");
CREATE INDEX "FunnelEvent_eventType_createdAt_idx" ON "FunnelEvent"("eventType", "createdAt");
CREATE INDEX "FunnelEvent_pagePath_createdAt_idx" ON "FunnelEvent"("pagePath", "createdAt");
CREATE INDEX "FunnelEvent_courseId_createdAt_idx" ON "FunnelEvent"("courseId", "createdAt");

ALTER TABLE "FunnelEvent"
  ADD CONSTRAINT "FunnelEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
