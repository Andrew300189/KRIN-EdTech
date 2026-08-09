-- Relational A1-C2 curriculum tree. Existing levels, categories and courses
-- remain untouched; courses become level-only placements until linked by CMS.

ALTER TYPE "CmsContentEntityType" ADD VALUE IF NOT EXISTS 'CURRICULUM_NODE';

CREATE TYPE "CurriculumNodeType" AS ENUM ('SECTION', 'TOPIC', 'SUBTOPIC');
CREATE TYPE "CourseCurriculumRelation" AS ENUM ('PRIMARY', 'RELATED');

CREATE TABLE "CurriculumNode" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "CurriculumNodeType" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseCurriculumLink" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "relation" "CourseCurriculumRelation" NOT NULL DEFAULT 'RELATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCurriculumLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumNode_levelId_type_slug_key" ON "CurriculumNode"("levelId", "type", "slug");
CREATE INDEX "CurriculumNode_levelId_parentId_type_order_idx" ON "CurriculumNode"("levelId", "parentId", "type", "order");
CREATE INDEX "CurriculumNode_contentStatus_scheduledAt_idx" ON "CurriculumNode"("contentStatus", "scheduledAt");
CREATE UNIQUE INDEX "CourseCurriculumLink_courseId_nodeId_key" ON "CourseCurriculumLink"("courseId", "nodeId");
CREATE INDEX "CourseCurriculumLink_nodeId_relation_idx" ON "CourseCurriculumLink"("nodeId", "relation");
CREATE INDEX "CourseCurriculumLink_courseId_relation_idx" ON "CourseCurriculumLink"("courseId", "relation");

ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "LanguageLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "CurriculumNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseCurriculumLink" ADD CONSTRAINT "CourseCurriculumLink_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseCurriculumLink" ADD CONSTRAINT "CourseCurriculumLink_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
