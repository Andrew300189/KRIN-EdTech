-- Keep every curriculum row and only correct the uniqueness scope. A topic
-- slug is navigated below its section, so sibling-level uniqueness is the
-- appropriate invariant for the curriculum tree.
DROP INDEX IF EXISTS "CurriculumNode_levelId_type_slug_key";

CREATE UNIQUE INDEX "CurriculumNode_levelId_type_parentId_slug_key"
  ON "CurriculumNode"("levelId", "type", "parentId", "slug");
