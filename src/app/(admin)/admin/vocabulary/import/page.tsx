import Link from "next/link";
import { VocabularyImportForm } from "@/modules/vocabulary/components/VocabularyImportForm";

export default function VocabularyImportPage() {
  return <div><Link href="/admin/vocabulary" className="text-sm font-semibold text-blue-700 hover:underline">← Vocabulary CMS</Link><h1 className="mt-4 text-3xl font-bold">Import vocabulary</h1><p className="mt-2 text-slate-600">Preview JSON or CSV rows before import. Every batch is validated and written with a server-side audit record.</p><VocabularyImportForm /></div>;
}
