ALTER TABLE "User"
  ADD COLUMN "placementLevel" "CefrLevel",
  ADD COLUMN "placementScore" INTEGER,
  ADD COLUMN "placementQuestionCount" INTEGER,
  ADD COLUMN "placementBreakdown" JSONB,
  ADD COLUMN "placementTestedAt" TIMESTAMP(3);

CREATE INDEX "User_placementLevel_placementTestedAt_idx"
  ON "User"("placementLevel", "placementTestedAt");
