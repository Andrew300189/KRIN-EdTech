-- CMS content workflow: lifecycle, immutable revisions, reusable media and
-- JSON content slots for the homepage and role workspaces.
CREATE TYPE "CmsContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CmsContentEntityType" AS ENUM ('LANGUAGE_LEVEL', 'COURSE_CATEGORY', 'COURSE', 'COURSE_MODULE', 'LESSON', 'LESSON_BLOCK', 'EXERCISE', 'GRAMMAR_TOPIC', 'WORD', 'CONTENT_SLOT');
CREATE TYPE "CmsContentVersionAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'RESTORED', 'DUPLICATED', 'IMPORTED', 'REORDERED');
CREATE TYPE "CmsMediaAssetKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER');
CREATE TYPE "CmsContentArea" AS ENUM ('HOME', 'STUDENT_DASHBOARD', 'TEACHER_DASHBOARD');

ALTER TABLE "LanguageLevel"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "CourseCategory"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Course"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "CourseModule"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Lesson"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "LessonBlock"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Exercise"
  ADD COLUMN "engineKey" TEXT NOT NULL DEFAULT 'choice',
  ADD COLUMN "variantKey" TEXT,
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "GrammarTopic"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Word"
  ADD COLUMN "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Preserve the visibility of content that was already live before the CMS
-- workflow was introduced. The existing boolean remains synchronized by the
-- CMS service so existing public readers do not break during rollout.
UPDATE "LanguageLevel" SET "contentStatus" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END;
UPDATE "CourseCategory" SET "contentStatus" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END;
UPDATE "Course" SET "contentStatus" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END;
UPDATE "CourseModule" SET "contentStatus" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END;
UPDATE "Lesson" SET "contentStatus" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END;
UPDATE "LessonBlock" AS block SET "contentStatus" = CASE WHEN lesson."isPublished" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN lesson."isPublished" THEN CURRENT_TIMESTAMP ELSE NULL END FROM "Lesson" AS lesson WHERE lesson.id = block."lessonId";
UPDATE "Exercise" AS exercise SET "contentStatus" = CASE WHEN block."contentStatus" = 'PUBLISHED'::"CmsContentStatus" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN block."contentStatus" = 'PUBLISHED'::"CmsContentStatus" THEN CURRENT_TIMESTAMP ELSE NULL END FROM "LessonBlock" AS block WHERE block.id = exercise."lessonBlockId";
UPDATE "GrammarTopic" SET "contentStatus" = 'PUBLISHED'::"CmsContentStatus", "publishedAt" = CURRENT_TIMESTAMP;
UPDATE "Word" SET "contentStatus" = CASE WHEN "isActive" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END, "publishedAt" = CASE WHEN "isActive" THEN CURRENT_TIMESTAMP ELSE NULL END;

CREATE TABLE "CmsContentVersion" (
  "id" TEXT NOT NULL,
  "entityType" "CmsContentEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" "CmsContentVersionAction" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "note" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsMediaAsset" (
  "id" TEXT NOT NULL,
  "kind" "CmsMediaAssetKind" NOT NULL,
  "url" TEXT NOT NULL,
  "storageKey" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "durationMs" INTEGER,
  "altText" TEXT,
  "caption" TEXT,
  "metadata" JSONB,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContentMedia" (
  "id" TEXT NOT NULL,
  "entityType" "CmsContentEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'inline',
  "order" INTEGER NOT NULL DEFAULT 0,
  "altText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsContentMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContentSlot" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "area" "CmsContentArea" NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsContentSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsContentVersion_entityType_entityId_version_key" ON "CmsContentVersion"("entityType", "entityId", "version");
CREATE INDEX "CmsContentVersion_entityType_entityId_createdAt_idx" ON "CmsContentVersion"("entityType", "entityId", "createdAt");
CREATE INDEX "CmsContentVersion_actorId_createdAt_idx" ON "CmsContentVersion"("actorId", "createdAt");
CREATE UNIQUE INDEX "CmsMediaAsset_url_key" ON "CmsMediaAsset"("url");
CREATE INDEX "CmsMediaAsset_kind_isArchived_createdAt_idx" ON "CmsMediaAsset"("kind", "isArchived", "createdAt");
CREATE INDEX "CmsMediaAsset_uploadedById_createdAt_idx" ON "CmsMediaAsset"("uploadedById", "createdAt");
CREATE UNIQUE INDEX "CmsContentMedia_entityType_entityId_mediaId_role_key" ON "CmsContentMedia"("entityType", "entityId", "mediaId", "role");
CREATE INDEX "CmsContentMedia_entityType_entityId_order_idx" ON "CmsContentMedia"("entityType", "entityId", "order");
CREATE UNIQUE INDEX "CmsContentSlot_key_key" ON "CmsContentSlot"("key");
CREATE INDEX "CmsContentSlot_area_contentStatus_scheduledAt_idx" ON "CmsContentSlot"("area", "contentStatus", "scheduledAt");

ALTER TABLE "CmsContentVersion" ADD CONSTRAINT "CmsContentVersion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsMediaAsset" ADD CONSTRAINT "CmsMediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsContentMedia" ADD CONSTRAINT "CmsContentMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "CmsMediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsContentSlot" ADD CONSTRAINT "CmsContentSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsContentSlot" ADD CONSTRAINT "CmsContentSlot_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
