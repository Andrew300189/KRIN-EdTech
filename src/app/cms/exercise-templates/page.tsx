import { prisma } from "@/core/server/prisma";
import { CmsExerciseTemplateLibrary } from "@/modules/cms/components/CmsExerciseTemplateLibrary";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { EXERCISE_ENGINES } from "@/modules/cms/exercise-engines/registry";

export default async function CmsExerciseTemplatesPage() {
  const [templates, lessons] = await Promise.all([
    prisma.cmsExerciseTemplate.findMany({ where: { isArchived: false }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, title: true, description: true, engineKey: true, type: true, isArchived: true } }),
    prisma.lesson.findMany({ take: 300, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, module: { select: { title: true, course: { select: { title: true } } } } } }),
  ]);
  return <CmsPageShell eyebrow="Exercise system" title="Universal exercise templates" description="Product exercise types are variants of universal engines. Saved templates turn a validated configuration into a new draft exercise."><CmsExerciseTemplateLibrary templates={templates} lessons={lessons} /><section className="mt-10"><h2 className="text-2xl font-bold text-slate-950">Available engines</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{EXERCISE_ENGINES.map((engine) => <article key={engine.key} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="font-mono text-xs text-blue-700">{engine.key}</p><h3 className="mt-2 text-lg font-bold text-slate-950">{engine.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{engine.description}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Renderer: {engine.renderer}</p></article>)}</div></section></CmsPageShell>;
}
