import Link from "next/link";
import type { CourseLevelData } from "@/modules/courses/types/course-catalog.types";

export function LevelCard({ level }: { level: CourseLevelData }) {
  return <Link href={`/courses/${level.level.toLowerCase()}`} aria-label={`Open ${level.level} courses`} className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-blue-700">{level.level}</p>{level.access === "premium" ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Premium</span> : null}</div><h2 className="mt-1 text-xl font-bold text-slate-900">{level.title}</h2><p className="mt-2 text-sm text-slate-600">{level.description}</p>
  </Link>;
}
