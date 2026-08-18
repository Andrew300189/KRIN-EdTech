import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsExerciseTemplateStudio } from "@/modules/cms/components/CmsExerciseTemplateStudio";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { getExerciseDefinitions, getExerciseEngine } from "@/modules/cms/exercise-engines/registry";

export default async function CmsExerciseTemplateSandboxPage({ params }: { params: Promise<{ engineKey: string }> }) {
  const engineKey = (await params).engineKey;
  const engine = getExerciseEngine(engineKey);
  if (!engine) notFound();
  const definitions = getExerciseDefinitions(engine.key).map(({ subtype, title }) => ({ subtype, title }));

  return <CmsPageShell eyebrow="Exercise sandbox" title={engine.title} description={engine.description} actions={<Link href="/cms/exercise-templates" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">All exercise templates</Link>}><CmsExerciseTemplateStudio engine={engine} definitions={definitions} /></CmsPageShell>;
}
