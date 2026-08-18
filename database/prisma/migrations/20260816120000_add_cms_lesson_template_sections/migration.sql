-- CreateTable
CREATE TABLE "CmsLessonTemplateSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsLessonTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsLessonTemplateSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsLessonTemplateSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmsLessonTemplateSection_createdById_createdAt_idx" ON "CmsLessonTemplateSection"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "CmsLessonTemplateSection_title_idx" ON "CmsLessonTemplateSection"("title");

-- CreateIndex
CREATE UNIQUE INDEX "CmsLessonTemplateSectionItem_sectionId_templateKey_key" ON "CmsLessonTemplateSectionItem"("sectionId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "CmsLessonTemplateSectionItem_sectionId_order_key" ON "CmsLessonTemplateSectionItem"("sectionId", "order");

-- CreateIndex
CREATE INDEX "CmsLessonTemplateSectionItem_templateKey_idx" ON "CmsLessonTemplateSectionItem"("templateKey");

-- AddForeignKey
ALTER TABLE "CmsLessonTemplateSection" ADD CONSTRAINT "CmsLessonTemplateSection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsLessonTemplateSectionItem" ADD CONSTRAINT "CmsLessonTemplateSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CmsLessonTemplateSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
