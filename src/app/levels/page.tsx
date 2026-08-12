/* eslint-disable @next/next/no-img-element -- level covers are owner-managed external HTTP(S) URLs. */
import Link from "next/link";
import { listPublishedLanguageLevels } from "@/modules/courses/services/content.service";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export default async function LevelsPage() {
  const levels = await listPublishedLanguageLevels();
  return <main><PublicSiteHeader /><div className="mx-auto max-w-6xl px-6 py-12">
    <header className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">KRIN EdTech</p><h1 className="mt-2 text-4xl font-bold text-slate-900">Choose your English level</h1><p className="mt-3 text-slate-600">Each level contains only its own published courses and lessons.</p></header>
    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="CEFR levels">
      {levels.map((level) => <Link key={level.id} href={`/levels/${level.code.toLowerCase()}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        {level.coverImage ? <img src={level.coverImage} alt="" className="h-32 w-full object-cover" /> : <div className="h-3 bg-gradient-to-r from-blue-700 to-indigo-700" />}
        <div className="p-6"><p className="text-3xl font-bold text-blue-700">{level.code}</p><h2 className="mt-2 text-xl font-bold text-slate-900">{level.title}</h2><p className="mt-2 text-sm text-slate-600">{level.description}</p><p className="mt-5 text-sm font-semibold text-blue-700">{level._count.courses} courses <span aria-hidden="true">→</span></p></div>
      </Link>)}
    </section>
  </div></main>;
}
