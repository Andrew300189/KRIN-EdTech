import { prisma } from "@/core/server/prisma";
import { CmsExerciseBulkWorkspace } from "@/modules/cms/components/CmsExerciseControls";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    take: 250,
    orderBy: { updatedAt: "desc" },
    select: { id: true, order: true, engineKey: true, type: true, question: true, basePoints: true, hintsEnabled: true, contentStatus: true },
  });
  return <CmsPageShell eyebrow="Learning content" title="Exercises" description="Exercises use reusable engines and validated configuration. Open an item for student preview, analytics, versions and reusable templates.">{exercises.length === 0 ? <CmsEmptyState description="No exercises have been created yet. Add one to an EXERCISE lesson block." /> : <CmsExerciseBulkWorkspace initialExercises={exercises} />}</CmsPageShell>;
}
