import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpecialCourse, getSpecialCourseTopic } from "@/modules/courses/data/special-course-catalog";

export default async function SpecialCourseTopicPage({
  params,
}: {
  params: Promise<{ slug: string; topic: string }>;
}) {
  const { slug, topic: topicSlug } = await params;
  const course = getSpecialCourse(slug);
  const topic = course ? getSpecialCourseTopic(course, topicSlug) : undefined;
  if (!course || !topic) notFound();

  return <main className="min-h-screen bg-slate-50 px-6 py-12">
    <article className="mx-auto max-w-3xl rounded-3xl border border-indigo-100 bg-white p-8 shadow-sm sm:p-12">
      <Link className="text-sm font-semibold text-indigo-700 hover:underline" href={`/courses/special/${course.slug}`}>← {course.title}</Link>
      <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">{course.title}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{topic.title}</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">This topic is ready for its lessons, practice, and assessments to be added next.</p>
      <Link className="mt-8 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" href={`/courses/special/${course.slug}`}>Choose another topic</Link>
    </article>
  </main>;
}
