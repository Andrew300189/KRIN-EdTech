import { AdminWordForm } from "@/modules/courses/components/admin/ContentForms";
import { listWordsForAdmin } from "@/modules/courses/services/content.service";

export default async function AdminWordsPage() {
  const words = await listWordsForAdmin();
  return <div><h1 className="text-3xl font-bold">Vocabulary CMS</h1><p className="mt-2 text-gray-600">Create reusable vocabulary entries and meanings.</p><div className="mt-6"><AdminWordForm /></div><section className="mt-8"><h2 className="text-xl font-bold">Words</h2><ul className="mt-3 grid gap-3 md:grid-cols-2">{words.map((word) => <li key={word.id} className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-bold">{word.lemma}</p><p className="mt-1 text-sm text-gray-600">{word.meanings[0]?.translation ?? word.meanings[0]?.definition ?? "No meaning"}</p><p className="mt-2 text-xs font-semibold text-blue-700">{word.cefrLevel ?? "Unassigned"}</p></li>)}</ul></section></div>;
}
