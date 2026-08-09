-- Explicit course ordering for drag-and-drop management inside a level/category.
ALTER TABLE "Course" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

WITH ranked_courses AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "levelId", "categoryId"
    ORDER BY "createdAt" ASC, "id" ASC
  ) AS position
  FROM "Course"
)
UPDATE "Course" AS course
SET "order" = ranked_courses.position
FROM ranked_courses
WHERE course.id = ranked_courses.id;

CREATE INDEX "Course_levelId_categoryId_order_idx" ON "Course"("levelId", "categoryId", "order");
