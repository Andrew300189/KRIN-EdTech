-- Add only bounded, non-sensitive attribution fields to first-party funnel
-- analytics. No client form values, full URLs, IP addresses, payment data or
-- user-agent strings are stored in this table.
CREATE TYPE "FunnelDeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP');
CREATE TYPE "FunnelEventResult" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'CANCELED', 'PENDING');

ALTER TABLE "FunnelEvent"
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "referrerPath" TEXT,
  ADD COLUMN "levelCode" "CefrLevel",
  ADD COLUMN "planCode" TEXT,
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "deviceType" "FunnelDeviceType",
  ADD COLUMN "result" "FunnelEventResult";

CREATE INDEX "FunnelEvent_sessionId_createdAt_idx" ON "FunnelEvent"("sessionId", "createdAt");
CREATE INDEX "FunnelEvent_levelCode_createdAt_idx" ON "FunnelEvent"("levelCode", "createdAt");
