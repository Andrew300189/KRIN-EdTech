import Link from "next/link";

export type PublicLevelCardData = { code: string; title: string; description: string; sectionCount: number };

export function LevelCard({ level }: { level: PublicLevelCardData }) {
  return <Link href={`/courses/${level.code.toLowerCase()}`} aria-label={`Open ${level.code} courses`} className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-blue-700">{level.code}</p></div><h2 className="mt-1 text-xl font-bold text-slate-900">{level.title}</h2><p className="mt-2 text-sm text-slate-600">{level.description}</p><p className="mt-4 text-sm font-semibold text-slate-700">{level.sectionCount} sections</p>
  </Link>;
}
