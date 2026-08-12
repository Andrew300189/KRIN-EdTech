import { prisma } from "@/core/server/prisma";
import { CmsGrammarRulesManager } from "@/modules/grammar/components/CmsGrammarRulesManager";
import { CmsPageShell, CmsEmptyState } from "@/modules/cms/components/CmsPageShell";

export default async function CmsGrammarPage() {
  const topics = await prisma.grammarTopic.findMany({ orderBy: [{ cefrLevel: "asc" }, { order: "asc" }, { title: "asc" }], include: { rules: { orderBy: [{ order: "asc" }, { title: "asc" }] } } });
  return <CmsPageShell eyebrow="Curriculum content" title="Grammar rules" description="Rules remain attached to their CEFR-scoped grammar topic. Reuse these relationships in lessons, exercises, reviews and reports.">{topics.length ? <div className="space-y-5">{topics.map((topic) => <article key={topic.id} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-violet-700">{topic.cefrLevel}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{topic.title}</h2>{topic.description ? <p className="mt-1 text-sm text-slate-600">{topic.description}</p> : null}<CmsGrammarRulesManager topicId={topic.id} rules={topic.rules} /></article>)}</div> : <CmsEmptyState description="Create a CEFR grammar topic first, then add its rules here." />}</CmsPageShell>;
}
