import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { createVocabularyTrainingSession } from "@/modules/vocabulary/services/vocabulary.service";

export default async function VocabularyTrainingPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/vocabulary/training");
  const requested = (await searchParams).session;
  const session = requested ? { id: requested } : await createVocabularyTrainingSession(authenticated.user.id, { source: "DAILY_REVIEW" });
  return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/profile/vocabulary" className="text-sm font-semibold text-blue-700 hover:underline">← My vocabulary</Link><header className="mt-5"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Spaced repetition</p><h1 className="mt-2 text-4xl font-bold text-slate-900">Vocabulary training</h1><p className="mt-3 text-slate-600">Answer from memory. Your next review date is calculated securely on the server.</p></header>{session ? <div className="mt-8"><VocabularyTrainingPlayer sessionId={session.id} /></div> : <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7"><h2 className="text-xl font-bold text-slate-900">Nothing is due right now</h2><p className="mt-2 text-slate-600">Add words from lessons or return when a review is scheduled.</p><Link href="/profile/vocabulary" className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Open dictionary</Link></section>}</main>;
}
