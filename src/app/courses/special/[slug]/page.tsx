import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpecialCourse } from "@/modules/courses/data/special-course-catalog";

export default async function SpecialCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getSpecialCourse(slug);
  if (!course) notFound();

  return <main className="min-h-screen bg-slate-50 px-6 py-12">
    <div className="mx-auto max-w-6xl">
      <Link className="text-sm font-semibold text-indigo-700 transition hover:text-indigo-900 hover:underline" href="/courses">← All courses</Link>
      <header className="mt-7 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Specialised English</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{course.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{course.description}</p>
      </header>
      <section aria-label={`${course.title} topics`} className="mt-10 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-2xl font-bold text-slate-900">Choose a topic</h2><p className="mt-2 text-slate-600">Select a focus area to continue.</p></div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{course.topics.length} topics</span>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          {course.topics.map((topic) => <Link className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" href={`/courses/special/${course.slug}/${topic.slug}`} key={topic.slug}><span>{topic.title}</span><span aria-hidden="true" className="text-indigo-600 transition group-hover:text-white">→</span></Link>)}
        </div>
      </section>
    </div>
  </main>;
}
