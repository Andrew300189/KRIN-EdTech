import Link from "next/link";
import type { CourseLevel, CourseSection } from "@/modules/courses/types/course-catalog.types";

/** A level page preview that deliberately renders every topic in the section. */
export function SectionCard({ level, section }: { level: CourseLevel; section: CourseSection }) {
  return <Link
    href={`/student/levels/${level.toLowerCase()}/sections/${section.slug}`}
    aria-label={`Open ${section.title} for ${level}; ${section.topics.length} topics`}
    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    <div className="flex items-start justify-between gap-4"><h3 className="text-xl font-bold text-slate-900">{section.title}</h3><span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{section.topics.length} topics</span></div>
    {section.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p> : null}
    {section.topics.length === 0 ? <p className="mt-4 text-sm text-slate-600">Content for this section has not been added yet.</p> : <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">{section.topics.map((topic) => <li key={topic.id} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400" /> <span>{topic.title}</span></li>)}</ul>}
    <span className="mt-5 inline-flex text-sm font-semibold text-blue-700">Open section <span aria-hidden="true" className="ml-1">→</span></span>
  </Link>;
}
