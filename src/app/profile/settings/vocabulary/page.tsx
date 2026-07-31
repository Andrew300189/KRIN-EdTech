import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { VocabularySettingsForm } from "@/modules/vocabulary/components/VocabularySettingsForm";
import { getVocabularySettings } from "@/modules/vocabulary/services/vocabulary.service";

export default async function VocabularySettingsPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/settings/vocabulary");
  const settings = await getVocabularySettings(authenticated.user.id);
  return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/profile/vocabulary" className="text-sm font-semibold text-blue-700 hover:underline">← My vocabulary</Link><h1 className="mt-5 text-4xl font-bold text-slate-900">Vocabulary settings</h1><p className="mt-3 text-slate-600">Control the pace and presentation of your reviews.</p><VocabularySettingsForm initial={settings} /></main>;
}
