-- The CMS stores one read cursor for the platform owner. Event data remains
-- canonical in User, CoursePurchase, Payment, SupportTicket and
-- SuspiciousActivity rather than being copied into a second notification log.
CREATE TABLE "CmsNotificationReadState" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsNotificationReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsNotificationReadState_ownerId_key" ON "CmsNotificationReadState"("ownerId");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");
CREATE INDEX "CoursePurchase_status_createdAt_idx" ON "CoursePurchase"("status", "createdAt");

ALTER TABLE "CmsNotificationReadState"
  ADD CONSTRAINT "CmsNotificationReadState_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
