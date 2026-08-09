import Link from "next/link";
import { getPublishedCurriculumSectionPage } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";

type CurriculumPage = NonNullable<Awaited<ReturnType<typeof getPublishedCurriculumSectionPage>>>;

export function PublicCurriculumPage({ page, currentPath }: { page: CurriculumPage; currentPath: string }) {
  const section = page.breadcrumbs[0];
  const topic = page.breadcrumbs.length > 1 ? page.breadcrumbs[1] : null;
  const sectionPath = `/levels/${page.level.code.toLowerCase()}/sections/${section.slug}`;
  const topicPath = topic ? `${sectionPath}/${topic.slug}` : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm font-semibold text-blue-700">
        <Link href={`/levels/${page.level.code.toLowerCase()}`} className="hover:underline">{page.level.code}</Link>
        {page.breadcrumbs.map((crumb, index) => {
          const href = index === 0 ? sectionPath : index === 1 && topicPath ? topicPath : currentPath;
          return <span key={crumb.id} className="contents"><span aria-hidden="true" className="text-slate-400">/</span>{href === currentPath ? <span className="text-slate-700">{crumb.title}</span> : <Link href={href} className="hover:underline">{crumb.title}</Link>}</span>;
        })}
      </nav>
      <header className="mt-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{page.level.code} curriculum</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950">{page.node.title}</h1>
        {page.node.description ? <p className="mt-3 text-slate-600">{page.node.description}</p> : null}
      </header>

      {page.childNodes.length ? <section className="mt-10" aria-label="Curriculum topics"><h2 className="text-2xl font-bold text-slate-950">Explore topics</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{page.childNodes.map((node) => <Link key={node.id} href={`${currentPath}/${node.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{node.type}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{node.title}</h3>{node.description ? <p className="mt-2 text-sm text-slate-600">{node.description}</p> : null}</Link>)}</div></section> : null}

      <section className="mt-10" aria-label="Published courses"><h2 className="text-2xl font-bold text-slate-950">Published courses</h2>{page.courses.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">Published courses in this part of the curriculum are being prepared.</p> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{page.courses.map((course) => <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.category.title}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{course.accessPlan === "FREE" ? "Free" : course.accessPlan === "PREMIUM" ? "Premium" : "Corporate"}</span></div><h3 className="mt-4 text-xl font-bold text-slate-950">{course.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{course.shortDescription}</p><p className="mt-5 text-sm text-slate-500">{course.lessonCount} lessons · {course.estimatedDuration || "—"} min</p><Link href={getPublicCourseHref(course.slug)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">View course</Link></article>)}</div>}</section>
    </main>
  );
}
