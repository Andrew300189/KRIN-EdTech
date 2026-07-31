import Link from "next/link";
import type { CourseCategory, CourseLevel, CourseSubtopic, CourseTopic } from "@/modules/courses/types/course-catalog.types";

export function SubtopicCard({ level, category, topic, subtopic }: { level: CourseLevel; category: CourseCategory; topic: CourseTopic; subtopic: CourseSubtopic }) {
  return <Link href={`/courses/${level.toLowerCase()}/${category}/${topic.slug}/${subtopic.slug}`} aria-label={`Open ${subtopic.title}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><h2 className="text-lg font-bold text-slate-900">{subtopic.title}</h2><p className="mt-2 text-sm text-slate-600">{subtopic.description ?? "Open this lesson."}</p></Link>;
}
