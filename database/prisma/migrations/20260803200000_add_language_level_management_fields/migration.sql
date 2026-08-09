-- CMS presentation and SEO metadata for the six fixed CEFR level containers.
ALTER TABLE "LanguageLevel"
  ADD COLUMN "coverImage" TEXT,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "seoKeywords" TEXT;
