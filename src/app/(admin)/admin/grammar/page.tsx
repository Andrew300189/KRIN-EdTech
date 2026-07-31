import { AdminGrammarForm } from "@/modules/courses/components/admin/ContentForms";
import { listGrammarTopics } from "@/modules/courses/services/content.service";

export default async function AdminGrammarPage() {
  const topics = await listGrammarTopics();
  return <div><h1 className="text-3xl font-bold">Grammar CMS</h1><p className="mt-2 text-gray-600">Create level-specific grammar topics without mixing CEFR content.</p><div className="mt-6"><AdminGrammarForm /></div><section className="mt-8"><h2 className="text-xl font-bold">Topics</h2><ul className="mt-3 grid gap-3 md:grid-cols-2">{topics.map((topic) => <li key={topic.id} className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-bold">{topic.title}</p><p className="mt-1 text-sm text-gray-600">{topic.description ?? "No description"}</p><p className="mt-2 text-xs font-semibold text-blue-700">{topic.cefrLevel}</p></li>)}</ul></section></div>;
}
