import Link from "next/link";
import { AdminVocabularyWordForm } from "@/modules/vocabulary/components/AdminVocabularyWordForm";

export default function NewVocabularyWordPage() {
  return <div><Link href="/admin/vocabulary" className="text-sm font-semibold text-blue-700 hover:underline">← Vocabulary CMS</Link><h1 className="mt-4 text-3xl font-bold">Create vocabulary word</h1><p className="mt-2 text-slate-600">The normalized lemma and part of speech must be unique.</p><div className="mt-6"><AdminVocabularyWordForm /></div></div>;
}
