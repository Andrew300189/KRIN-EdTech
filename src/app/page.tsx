import Link from "next/link";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listHomepageCourses, listHomepageCurriculumNodes } from "@/modules/courses/services/content.service";
import { getPublicCourseHref, getPublicCurriculumHref } from "@/modules/courses/utils/public-content-routes";

export default async function Home() {
  const [heroSlot, featuredCurriculum, featuredCourses] = await Promise.all([
    getPublishedCmsContentSlot("home.hero"),
    listHomepageCurriculumNodes(),
    listHomepageCourses(),
  ]);

  return (
    <main className="min-h-screen bg-white">
      {heroSlot ? <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6"><CmsManagedSlotBanner slot={heroSlot} /></div> : null}
      <iframe src="/legacy/index.html" title="KRIN EdTech Legacy Landing" className="relative z-0 h-screen w-full border-0" />

      {featuredCurriculum.length ? <section className="mx-auto max-w-7xl px-6 py-16"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Explore the curriculum</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Featured learning topics</h2><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featuredCurriculum.map((node) => { const href = getPublicCurriculumHref(node); return href ? <Link key={node.id} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{node.level.code} · {node.type}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{node.title}</h3><p className="mt-2 text-sm text-slate-600">{node.description ?? `Explore ${node.level.title}.`}</p></Link> : <article key={node.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{node.level.code} · {node.type}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{node.title}</h3><p className="mt-2 text-sm text-slate-600">{node.description ?? `Explore ${node.level.title}.`}</p></article>; })}</div></section> : null}
      {featuredCourses.length ? <section className="mx-auto max-w-7xl px-6 py-16"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Featured courses</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Start a new learning path</h2><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featuredCourses.map((course) => <Link key={course.id} href={getPublicCourseHref(course.slug)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{course.level.code} · {course.category.title}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{course.title}</h3><p className="mt-2 text-sm text-slate-600">{course.shortDescription}</p><p className="mt-4 text-sm font-semibold text-blue-700">{course.accessPlan === "FREE" ? "Start free" : "Explore course"} →</p></Link>)}</div></section> : null}
    </main>
  );
}
