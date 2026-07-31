import Link from "next/link";
import { notFound } from "next/navigation";
import {
  countPublishedCourses,
  listPublishedCourseCategories,
  listPublishedCourses,
  listPublishedLanguageLevels,
} from "@/modules/courses/services/content.service";
import type { CourseCatalogFilters } from "@/modules/courses/services/content.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const pageSize = 12;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function makeQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const levelCode = first(params.level);
  const categorySlug = first(params.category);
  const access = first(params.access);
  const sort = first(params.sort);
  const query = first(params.q);
  const filters: CourseCatalogFilters = {
    query,
    levelCode,
    categorySlug,
    accessPlan: access === "FREE" || access === "PREMIUM" || access === "CORPORATE" ? access : undefined,
    sort: sort === "title" || sort === "duration" ? sort : "newest" as const,
    page,
    pageSize,
  };
  const [courses, total, levels, categories] = await Promise.all([
    listPublishedCourses(filters),
    countPublishedCourses(filters),
    listPublishedLanguageLevels(),
    listPublishedCourseCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages && total > 0) notFound();
  const baseQuery = { q: query, level: levelCode, category: categorySlug, access: filters.accessPlan, sort: filters.sort === "newest" ? undefined : filters.sort };

  return <main className="mx-auto max-w-7xl px-6 py-12">
    <header className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Course catalogue</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-900">Find your next English course</h1>
      <p className="mt-3 text-slate-600">Courses, lessons and access settings are loaded from the CMS. Only published content is shown.</p>
    </header>

    <form className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5" method="get">
      <label className="md:col-span-2"><span className="sr-only">Search courses</span><input name="q" defaultValue={query} placeholder="Search courses" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" /></label>
      <label><span className="sr-only">Level</span><select name="level" defaultValue={levelCode ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">All levels</option>{levels.map((level) => <option key={level.code} value={level.code}>{level.code} — {level.title}</option>)}</select></label>
      <label><span className="sr-only">Category</span><select name="category" defaultValue={categorySlug ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">All categories</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.title}</option>)}</select></label>
      <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Apply filters</button>
      <label><span className="sr-only">Access</span><select name="access" defaultValue={filters.accessPlan ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">All access</option><option value="FREE">Free</option><option value="PREMIUM">Premium</option><option value="CORPORATE">Corporate</option></select></label>
      <label><span className="sr-only">Sort courses</span><select name="sort" defaultValue={filters.sort} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="newest">Newest first</option><option value="title">Title A–Z</option><option value="duration">Shortest first</option></select></label>
      <Link href="/courses" className="self-center text-center text-sm font-semibold text-blue-700 hover:underline">Clear filters</Link>
    </form>

    <section className="mt-10" aria-label="Course categories">
      <h2 className="text-2xl font-bold text-slate-900">Browse by direction</h2>
      <div className="mt-4 flex flex-wrap gap-3">{categories.filter((category) => category._count.courses > 0).map((category) => <Link key={category.id} href={`/courses/categories/${category.slug}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">{category.icon ? <span aria-hidden="true">{category.icon} </span> : null}{category.title}</Link>)}</div>
    </section>

    <section className="mt-10" aria-label="Published courses">
      <div className="flex items-baseline justify-between gap-4"><h2 className="text-2xl font-bold text-slate-900">Available courses</h2><p className="text-sm text-slate-600">{total} {total === 1 ? "course" : "courses"}</p></div>
      {courses.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-slate-600">No published courses match these filters. Try another level, category or search phrase.</p> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{course.level.code}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.category.title}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{course.accessPlan === "FREE" ? "Free" : course.accessPlan === "PREMIUM" ? "Premium" : "Corporate"}</span></div><h3 className="mt-4 text-xl font-bold text-slate-900">{course.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{course.shortDescription}</p><p className="mt-5 text-sm text-slate-500">{course.lessonCount} lessons · {course.estimatedDuration || "—"} min</p><Link href={`/courses/${course.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">View course</Link></article>)}</div>}
      {totalPages > 1 ? <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Course pages">{page > 1 ? <Link href={`/courses${makeQuery({ ...baseQuery, page: String(page - 1) })}`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">Previous</Link> : null}<span className="text-sm text-slate-600">Page {page} of {totalPages}</span>{page < totalPages ? <Link href={`/courses${makeQuery({ ...baseQuery, page: String(page + 1) })}`} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">Next</Link> : null}</nav> : null}
    </section>
  </main>;
}
