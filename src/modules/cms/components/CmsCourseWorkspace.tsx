"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import styles from "./CmsCourseWorkspace.module.css";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  order: number;
  contentStatus: string;
  isTemplate: boolean;
  courseType: "STANDARD" | "INTENSIVE" | "EXAM_PREP" | "PROFESSIONAL" | "SPECIALIZATION" | "SKILL";
  level: { code: string; title: string };
  category: { slug: string; title: string };
  modules: number;
};

type LifecycleAction = "PUBLISH" | "SUBMIT_FOR_REVIEW" | "UNPUBLISH" | "ARCHIVE" | "RESTORE";

function statusClass(status: string) {
  if (status === "PUBLISHED") return styles.statusPublished;
  if (status === "REVIEW" || status === "SCHEDULED") return styles.statusReview;
  if (status === "ARCHIVED") return styles.statusArchived;
  return styles.statusDraft;
}

function readableCourseType(type: CourseRow["courseType"]) {
  return type.split("_").map((word) => `${word.slice(0, 1)}${word.slice(1).toLowerCase()}`).join(" ");
}

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
  const [deleteCandidate, setDeleteCandidate] = useState<CourseRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const query = searchParams.get("q") ?? "";
  const level = searchParams.get("level") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const courseType = searchParams.get("type") ?? "ALL";

  useEffect(() => setCourses(initialCourses), [initialCourses]);

  const visible = useMemo(() => courses.filter((course) => {
    const search = query.trim().toLowerCase();
    return (!search || `${course.title} ${course.slug} ${course.category.title}`.toLowerCase().includes(search))
      && (level === "ALL" || course.level.code === level)
      && (status === "ALL" || course.contentStatus === status)
      && (courseType === "ALL" || course.courseType === courseType);
  }), [courseType, courses, level, query, status]);

  function setFilter(key: "q" | "level" | "status" | "type", value: string) {
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
      setMessage(response.ok ? { text: "Course copied as a draft." } : { text: payload.error ?? "Unable to copy the course.", error: true });
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
      if (!response.ok) { setMessage({ text: payload.error ?? "Unable to reorder courses.", error: true }); return; }
      setCourses((current) => current.map((item) => {
        const position = orderedIds.indexOf(item.id);
        return position >= 0 ? { ...item, order: position + 1 } : item;
      }));
      setMessage({ text: "Course order saved." });
      router.refresh();
    });
  }

  function deleteCourse() {
    if (!deleteCandidate) return;
    const course = deleteCandidate;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/courses/${course.id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; impact?: { blockers?: string[] } };
      if (!response.ok) {
        const blockers = payload.impact?.blockers?.join(" ");
        setMessage({ text: blockers || payload.error || "Unable to delete course.", error: true });
        setDeleteCandidate(null);
        return;
      }
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setSelectedIds((current) => current.filter((id) => id !== course.id));
      setDeleteCandidate(null);
      setMessage({ text: `${course.title} was permanently removed from the site.` });
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
      if (!response.ok && response.status !== 207) { setMessage({ text: payload.error ?? "Unable to update selected courses.", error: true }); return; }
      setMessage({ text: `${payload.data?.succeeded ?? 0} course(s) updated${payload.data?.failed ? `; ${payload.data.failed} failed.` : "."}` });
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
      if (!response.ok && response.status !== 207) { setMessage({ text: payload.error ?? "Unable to update selected courses.", error: true }); return; }
      setMessage({ text: `${payload.data?.succeeded ?? 0} course(s) updated${payload.data?.failed ? `; ${payload.data.failed} failed.` : "."}` });
      setSelectedIds([]);
      router.refresh();
    });
  }

  const allVisibleSelected = visible.length > 0 && visible.every((course) => selectedIds.includes(course.id));
  const published = courses.filter((course) => course.contentStatus === "PUBLISHED").length;
  const drafts = courses.filter((course) => course.contentStatus === "DRAFT").length;

  return <section className={styles.workspace} aria-busy={isPending}>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>Learning content</p><h1>Courses</h1><p>Build, publish and organize the A1-C2 course catalogue from one dashboard workspace.</p></div>
      <Link href="/cms/courses/new" className={styles.createButton}><Plus size={17} aria-hidden="true" /> Create course</Link>
    </header>

    <section className={styles.summary} aria-label="Course overview"><article><span>All courses</span><strong>{courses.length}</strong></article><article><span>Published</span><strong>{published}</strong></article><article><span>Drafts</span><strong>{drafts}</strong></article><article><span>Visible now</span><strong>{visible.length}</strong></article></section>

    <section className={styles.filters} aria-label="Course filters">
      <label className={styles.searchField}>Search courses<input value={query} onChange={(event) => setFilter("q", event.target.value)} placeholder="Course, slug or category" /></label>
      <label>Level<select value={level} onChange={(event) => setFilter("level", event.target.value)}><option value="ALL">All levels</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.title}</option>)}</select></label>
      <label>Status<select value={status} onChange={(event) => setFilter("status", event.target.value)}><option value="ALL">All statuses</option>{["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Format<select value={courseType} onChange={(event) => setFilter("type", event.target.value)}><option value="ALL">All formats</option><option value="STANDARD">Standard</option><option value="INTENSIVE">Intensive</option><option value="EXAM_PREP">Exam preparation</option><option value="PROFESSIONAL">Professional English</option><option value="SPECIALIZATION">Specialization</option><option value="SKILL">Skill course</option></select></label>
    </section>

    {selectedIds.length ? <section className={styles.bulkBar} aria-label="Bulk course actions"><div><strong>{selectedIds.length}</strong> selected</div><label>Level<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ levelCode: event.target.value }); event.currentTarget.value = ""; }}><option value="">Change level</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label><label>Category<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ categorySlug: event.target.value }); event.currentTarget.value = ""; }}><option value="">Change category</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label><label>Access<select defaultValue="" disabled={isPending} onChange={(event) => { if (event.target.value) bulkUpdate({ accessMode: event.target.value }); event.currentTarget.value = ""; }}><option value="">Change access</option><option value="FREE">Free</option><option value="SUBSCRIPTION">Subscription</option><option value="ONE_TIME_PURCHASE">One-time purchase</option><option value="TEACHER_ASSIGNMENT">Teacher assignment</option><option value="HIDDEN">Hidden</option></select></label><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInCatalog: true })}>Show in catalog</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInCatalog: false })}>Hide from catalog</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInSearch: true })}>Show in search</button><button type="button" disabled={isPending} onClick={() => bulkUpdate({ isVisibleInSearch: false })}>Hide from search</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("PUBLISH")}>Publish</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("SUBMIT_FOR_REVIEW")}>Review</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("UNPUBLISH")}>Unpublish</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("ARCHIVE")}>Archive</button><button type="button" disabled={isPending} onClick={() => bulkLifecycle("RESTORE")}>Restore draft</button><button type="button" disabled={isPending} onClick={() => setSelectedIds([])} className={styles.clearButton}>Clear</button></section> : null}

    {message ? <p role="status" className={`${styles.message} ${message.error ? styles.messageError : ""}`}>{message.text}</p> : null}

    <div className={styles.gridToolbar}><label className={styles.selectAll}><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleCourses} /> Select all visible</label><span>{visible.length} course{visible.length === 1 ? "" : "s"}</span></div>
    {visible.length ? <section className={styles.courseGrid} aria-label="Courses">{visible.map((course) => <article key={course.id} className={styles.courseCard}>
      <div className={styles.cardTop}><label className={styles.selectCourse}><input type="checkbox" checked={selectedIds.includes(course.id)} onChange={() => toggleCourse(course.id)} aria-label={`Select ${course.title}`} /></label><div className={styles.tags}><span className={styles.levelTag}>{course.level.code}</span><span className={`${styles.statusTag} ${statusClass(course.contentStatus)}`}>{course.contentStatus}</span>{course.isTemplate ? <span className={styles.templateTag}>Template</span> : null}</div></div>
      <div className={styles.cardBody}><h2>{course.title}</h2><p>{course.shortDescription || "No short description yet."}</p><span className={styles.slug}>{course.slug}</span></div>
      <dl className={styles.meta}><div><dt>Placement</dt><dd>{course.category.title}</dd></div><div><dt>Structure</dt><dd>{course.modules} modules</dd></div><div><dt>Format</dt><dd>{readableCourseType(course.courseType)}</dd></div><div><dt>Order</dt><dd>#{course.order}</dd></div></dl>
      <div className={styles.orderControls}><button type="button" disabled={isPending} onClick={() => reorder(course, -1)} aria-label={`Move ${course.title} up`}><ArrowUp size={15} aria-hidden="true" /> Up</button><button type="button" disabled={isPending} onClick={() => reorder(course, 1)} aria-label={`Move ${course.title} down`}><ArrowDown size={15} aria-hidden="true" /> Down</button><label><span className="sr-only">Copy {course.title} to level</span><Copy size={14} aria-hidden="true" /><select defaultValue="" onChange={(event) => duplicate(course.id, event.target.value)} disabled={isPending}><option value="">Copy to level</option>{levels.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label></div>
      <div className={styles.cardActions}><Link href={`/cms/courses/${course.id}`}><Pencil size={15} aria-hidden="true" /> Edit</Link><Link href={`/cms/preview/courses/${course.id}`}><Eye size={15} aria-hidden="true" /> Preview</Link><button type="button" onClick={() => setDeleteCandidate(course)} disabled={isPending} className={styles.deleteButton}><Trash2 size={15} aria-hidden="true" /> Delete</button></div>
      <div className={styles.lifecycle}><CmsLifecycleControls entityType="COURSE" entityId={course.id} status={course.contentStatus} compact /></div>
    </article>)}</section> : <section className={styles.empty}><h2>No courses match these filters</h2><p>Change a filter or create a new course.</p><Link href="/cms/courses/new">Create course</Link></section>}

    <ConfirmDialog open={deleteCandidate !== null} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }} title={deleteCandidate ? `Permanently delete ${deleteCandidate.title}?` : "Permanently delete course?"} description="This removes the course from the site and deletes its modules, lessons, blocks, exercises and unused checkout products. The server will block deletion if any learner, payment, assignment or progress history exists." confirmLabel="Delete permanently" onConfirm={deleteCourse} isProcessing={isPending}><p>If protected history exists, the course will not be deleted and you can archive it instead.</p></ConfirmDialog>
  </section>;
}
