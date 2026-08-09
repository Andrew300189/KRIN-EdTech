"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  order: number;
  contentStatus: string;
  isTemplate: boolean;
  level: { code: string; title: string };
  category: { slug: string; title: string };
  modules: number;
};

type LifecycleAction = "PUBLISH" | "SUBMIT_FOR_REVIEW" | "UNPUBLISH" | "ARCHIVE" | "RESTORE";

export function CmsCourseWorkspace({ initialCourses, levels, categories }: {
  initialCourses: CourseRow[];
  levels: Array<{ code: string; title: string }>;
  categories: Array<{ slug: string; title: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState(initialCourses);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const query = searchParams.get("q") ?? "";
  const level = searchParams.get("level") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";

  useEffect(() => setCourses(initialCourses), [initialCourses]);

  const visible = useMemo(() => courses.filter((course) => {
    const search = query.trim().toLowerCase();
    return (!search || `${course.title} ${course.slug} ${course.category.title}`.toLowerCase().includes(search))
      && (level === "ALL" || course.level.code === level)
      && (status === "ALL" || course.contentStatus === status);
  }), [courses, level, query, status]);

  function setFilter(key: "q" | "level" | "status", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") next.delete(key); else next.set(key, value);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function duplicate(courseId: string, targetLevelCode: string) {
    if (!targetLevelCode) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/content/COURSE/${courseId}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetLevelCode }) });
      const payload = await response.json() as { error?: string };
      setMessage(response.ok ? "Course copied as a draft." : payload.error ?? "Unable to copy the course.");
      if (response.ok) router.refresh();
    });
  }

  function reorder(course: CourseRow, direction: -1 | 1) {
    const siblings = courses.filter((item) => item.level.code === course.level.code && item.category.slug === course.category.slug).sort((left, right) => left.order - right.order);
    const index = siblings.findIndex((item) => item.id === course.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const orderedIds = next.map((item) => item.id);
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/cms/content/COURSE/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) { setMessage(payload.error ?? "Unable to reorder courses."); return; }
      setCourses((current) => current.map((item) => {
        const position = orderedIds.indexOf(item.id);
        return position >= 0 ? { ...item, order: position + 1 } : item;
      }));
      setMessage("Course order saved.");
      router.refresh();
    });
  }

  function toggleCourse(courseId: string) {
    setSelectedIds((current) => current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]);
  }

  function toggleVisibleCourses() {
    const ids = visible.map((course) => course.id);
    setSelectedIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
  }

  function bulkUpdate(data: Record<string, string | boolean>) {
    if (!selectedIds.length) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/cms/courses/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseIds: selectedIds, ...data }) });
      const payload = await response.json() as { error?: string; data?: { succeeded: number; failed: number } };
      if (!response.ok && response.status !== 207) { setMessage(payload.error ?? "Unable to update selected courses."); return; }
      setMessage(`${payload.data?.succeeded ?? 0} course(s) updated${payload.data?.failed ? `; ${payload.data.failed} failed.` : "."}`);
      setSelectedIds([]);
      router.refresh();
    });
  }

  function bulkLifecycle(action: LifecycleAction) {
    if (!selectedIds.length) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/cms/content/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType: "COURSE", entityIds: selectedIds, action }) });
      const payload = await response.json() as { error?: string; data?: { succeeded: number; failed: number } };
      if (!response.ok && response.status !== 207) { setMessage(payload.error ?? "Unable to update selected courses."); return; }
      setMessage(`${payload.data?.succeeded ?? 0} course(s) updated${payload.data?.failed ? `; ${payload.data.failed} failed.` : "."}`);
      setSelectedIds([]);
      router.refresh();
    });
  }

  const allVisibleSelected = visible.length > 0 && visible.every((course) => selectedIds.includes(course.id));
  const bulkSelectClass = "ml-1 rounded border border-blue-200 bg-white px-2 py-1";
  const bulkButtonClass = "rounded border px-2 py-1 text-sm font-semibold hover:bg-white disabled:opacity-50";

  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Learning content</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Courses and CEFR structure</h1><p className="mt-2 max-w-3xl text-slate-600">Manage the existing A1–C2 curriculum. New copies are always drafts, so learners never see unfinished content.</p></div><Link href="/cms/courses/new" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Create course</Link></header>

    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Search<input value={query} onChange={(event) => setFilter("q", event.target.value)} placeholder="Course, slug, category" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Level<select value={level} onChange={(event) => setFilter("level", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ALL">All levels</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Status<select value={status} onChange={(event) => setFilter("status", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ALL">All statuses</option>{["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"].map((item) => <option key={item}>{item}</option>)}</select></label></div>

    {selectedIds.length ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="mr-2 text-sm font-semibold text-blue-950">{selectedIds.length} selected</p><label className="text-sm">Level<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ levelCode: event.target.value }); event.currentTarget.value = ""; }} className={bulkSelectClass}><option value="">Change…</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label><label className="text-sm">Category<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ categorySlug: event.target.value }); event.currentTarget.value = ""; }} className={bulkSelectClass}><option value="">Change…</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label><label className="text-sm">Access<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ accessMode: event.target.value }); event.currentTarget.value = ""; }} className={bulkSelectClass}><option value="">Change…</option><option value="FREE">Free</option><option value="SUBSCRIPTION">Subscription</option><option value="ONE_TIME_PURCHASE">One-time purchase</option><option value="TEACHER_ASSIGNMENT">Teacher assignment</option><option value="HIDDEN">Hidden</option></select></label><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInCatalog: true })} className={`${bulkButtonClass} border-blue-300`}>Show in catalog</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInCatalog: false })} className={`${bulkButtonClass} border-blue-300`}>Hide from catalog</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInSearch: true })} className={`${bulkButtonClass} border-blue-300`}>Show in search</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInSearch: false })} className={`${bulkButtonClass} border-blue-300`}>Hide from search</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("PUBLISH")} className={`${bulkButtonClass} border-emerald-300 text-emerald-800`}>Publish</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("SUBMIT_FOR_REVIEW")} className={`${bulkButtonClass} border-slate-300`}>Review</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("UNPUBLISH")} className={`${bulkButtonClass} border-slate-300`}>Unpublish</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("ARCHIVE")} className={`${bulkButtonClass} border-rose-300 text-rose-800`}>Archive</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("RESTORE")} className={`${bulkButtonClass} border-slate-300`}>Restore draft</button><button type="button" disabled={isPending} onClick={() => setSelectedIds([])} className="text-sm text-slate-600 underline">Clear</button></div> : null}

    {message ? <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleCourses} aria-label="Select visible courses" /></th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Placement</th><th className="px-4 py-3">Structure</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{visible.map((course) => <tr key={course.id} className="border-t border-slate-100 align-top"><td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(course.id)} onChange={() => toggleCourse(course.id)} aria-label={`Select ${course.title}`} /></td><td className="px-4 py-4"><p className="font-semibold text-slate-950">{course.title}{course.isTemplate ? <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">Template</span> : null}</p><p className="mt-1 max-w-md text-xs text-slate-500">{course.shortDescription}</p><p className="mt-1 font-mono text-xs text-slate-400">{course.slug}</p></td><td className="px-4 py-4 text-slate-700"><p>{course.level.code} · {course.category.title}</p><div className="mt-2 flex gap-1"><button type="button" disabled={isPending} onClick={() => reorder(course, -1)} className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50" aria-label={`Move ${course.title} up`}>↑</button><button type="button" disabled={isPending} onClick={() => reorder(course, 1)} className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50" aria-label={`Move ${course.title} down`}>↓</button><span className="self-center text-xs text-slate-500">#{course.order}</span></div></td><td className="px-4 py-4 text-slate-700">{course.modules} modules</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{course.contentStatus}</span></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Link href={`/cms/courses/${course.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Edit structure</Link><Link href={`/cms/preview/courses/${course.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Preview</Link><label className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"><span className="sr-only">Copy {course.title} to level</span><select defaultValue="" onChange={(event) => duplicate(course.id, event.target.value)} disabled={isPending} className="bg-transparent text-xs"><option value="">Copy to…</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label></div><div className="mt-2"><CmsLifecycleControls entityType="COURSE" entityId={course.id} status={course.contentStatus} compact /></div></td></tr>)}{visible.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No courses match these filters.</td></tr> : null}</tbody></table></div>
  </section>;
}
