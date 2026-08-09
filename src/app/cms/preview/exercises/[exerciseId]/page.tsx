import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsExerciseStudentPreview } from "@/modules/cms/components/CmsExerciseEditor";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { validateExerciseConfiguration } from "@/modules/cms/services/exercise-operations.service";

export default async function CmsExercisePreviewPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const exercise = await prisma.exercise.findUnique({ where: { id: (await params).exerciseId }, select: { id: true, type: true, engineKey: true, instruction: true, question: true, content: true, correctAnswer: true, alternativeAnswers: true, hint: true, hintsEnabled: true } });
  if (!exercise) notFound();
  const issues = validateExerciseConfiguration(exercise);
  return <CmsPageShell eyebrow="Exercise preview" title={exercise.question} description="This simulation does not create an ExerciseAttempt or modify learner analytics." actions={<Link href={`/cms/exercises/${exercise.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">Back to editor</Link>}>{issues.length ? <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-semibold text-rose-900">Fix configuration before publishing</p><ul className="mt-2 list-disc pl-5 text-sm text-rose-800">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section> : null}<CmsExerciseStudentPreview exercise={exercise} /></CmsPageShell>;
}
