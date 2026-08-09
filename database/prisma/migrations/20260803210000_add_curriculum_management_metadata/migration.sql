-- CMS metadata, display controls and relational localizations for the level curriculum tree.
ALTER TABLE "CurriculumNode"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "seoKeywords" TEXT,
  ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showInSearch" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CurriculumNodeTranslation" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "seoKeywords" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumNodeTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumNodeTranslation_nodeId_locale_key" ON "CurriculumNodeTranslation"("nodeId", "locale");
CREATE INDEX "CurriculumNodeTranslation_locale_title_idx" ON "CurriculumNodeTranslation"("locale", "title");
ALTER TABLE "CurriculumNodeTranslation" ADD CONSTRAINT "CurriculumNodeTranslation_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
