import Link from "next/link";
import type { CourseLevel, CourseTopic } from "@/modules/courses/types/course-catalog.types";

export function TopicCard({ level, section, topic }: { level: CourseLevel; section: string; topic: CourseTopic }) {
  return <Link href={`/student/levels/${level.toLowerCase()}/sections/${section}/${topic.slug}`} aria-label={`Open ${topic.title} for ${level}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
    <h2 className="text-lg font-bold text-slate-900">{topic.title}</h2>{topic.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p> : null}{topic.example ? <p className="mt-3 text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Example: </span>{topic.example}</p> : null}
  </Link>;
}
