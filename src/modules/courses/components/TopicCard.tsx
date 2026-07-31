import Link from "next/link";
import type { CourseLevel, CourseCategory, CourseTopic } from "@/modules/courses/types/course-catalog.types";

export function TopicCard({ level, category, topic }: { level: CourseLevel; category: CourseCategory; topic: CourseTopic }) {
  return <Link href={`/courses/${level.toLowerCase()}/${category}/${topic.slug}`} aria-label={`Open ${topic.title}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
    <h2 className="text-lg font-bold text-slate-900">{topic.title}</h2><p className="mt-2 text-sm text-slate-600">{topic.description}</p>
  </Link>;
}
