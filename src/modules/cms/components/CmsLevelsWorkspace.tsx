"use client";

/* eslint-disable @next/next/no-img-element -- CMS accepts owner-managed HTTP(S) cover URLs. */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type CurriculumNode = { type: "SECTION" | "TOPIC" | "SUBTOPIC"; contentStatus: string };
type Course = { id: string; contentStatus: string; modules: Array<{ id: string; lessons: Array<{ id: string }> }> };

export type CmsLevelRow = {
  id: string;
  code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  description: string;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  order: number;
  isPublished: boolean;
  contentStatus: string;
  _count: { courses: number; curriculumNodes: number };
  courses: Course[];
  curriculumNodes: CurriculumNode[];
};

function completeness(level: CmsLevelRow) {
  const missing: string[] = [];
  if (!level.description.trim()) missing.push("description");
  if (!level.coverImage) missing.push("cover");
  if (!level.seoTitle) missing.push("SEO title");
  if (!level.seoDescription) missing.push("SEO description");
  if (!level.curriculumNodes.some((node) => node.type === "SECTION")) missing.push("section");
  if (level.courses.length === 0) missing.push("course");
  const { modules, lessons } = contentCounts(level);
  if (level.courses.length > 0 && modules === 0) missing.push("module");
  if (modules > 0 && lessons === 0) missing.push("lesson");
  return missing;
}

function countType(level: CmsLevelRow, type: CurriculumNode["type"]) {
  return level.curriculumNodes.filter((node) => node.type === type).length;
}

function contentCounts(level: CmsLevelRow) {
  const modules = level.courses.reduce((total, course) => total + course.modules.length, 0);
  const lessons = level.courses.reduce((total, course) => total + course.modules.reduce((moduleTotal, module) => moduleTotal + module.lessons.length, 0), 0);
  return { modules, lessons };
}

export function CmsLevelsWorkspace({ initialLevels }: { initialLevels: CmsLevelRow[] }) {
  const router = useRouter();
  const [levels, setLevels] = useState(initialLevels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLevels(initialLevels), [initialLevels]);
  const orderedLevels = useMemo(() => [...levels].sort((left, right) => left.order - right.order), [levels]);

  function move(level: CmsLevelRow, direction: -1 | 1) {
    const index = orderedLevels.findIndex((item) => item.id === level.id);
    const target = index + direction;
    if (target < 0 || target >= orderedLevels.length) return;
    const next = [...orderedLevels];
    [next[index], next[target]] = [next[target], next[index]];
    const orderedIds = next.map((item) => item.id);

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/cms/content/LANGUAGE_LEVEL/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to change the level order.");
        return;
      }
      setLevels(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
      setMessage("Level order saved.");
      router.refresh();
    });
  }

  function save(event: FormEvent<HTMLFormElement>, level: CmsLevelRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/levels/${level.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          coverImage: form.get("coverImage"),
          seoTitle: form.get("seoTitle"),
          seoDescription: form.get("seoDescription"),
          seoKeywords: form.get("seoKeywords"),
        }),
      });
      const payload = await response.json() as { error?: string; data?: Partial<CmsLevelRow> };
      if (!response.ok || !payload.data) {
        setMessage(payload.error ?? "Unable to save level details.");
        return;
      }
      setLevels((current) => current.map((item) => item.id === level.id ? { ...item, ...payload.data } : item));
      setEditingId(null);
      setMessage(`${level.code} details saved.`);
      router.refresh();
    });
  }

  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Curriculum containers</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">CEFR levels A1–C2</h1>
        <p className="mt-2 max-w-3xl text-slate-600">The six standard codes are fixed and unique. Edit their presentation, order and visibility; courses and modules stay within their selected level.</p>
      </div>
      <Link href="/cms/courses/new" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Create course</Link>
    </header>

    {message ? <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {orderedLevels.map((level, index) => {
        const missing = completeness(level);
        const { modules, lessons } = contentCounts(level);
        const isEditing = editingId === level.id;
        return <article key={level.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-32 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900">
            {level.coverImage ? <img src={level.coverImage} alt="" className="h-full w-full object-cover opacity-75" /> : null}
            <div className="absolute inset-0 bg-slate-950/20" />
            <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 text-white"><div><p className="text-sm font-semibold tracking-wide">CEFR {level.code}</p><h2 className="text-2xl font-bold">{level.title}</h2></div><span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">{level.contentStatus}</span></div>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-slate-600">{level.description}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Structure</dt><dd className="font-semibold text-slate-900">{countType(level, "SECTION")} sections · {countType(level, "TOPIC")} topics</dd></div><div><dt className="text-slate-500">Courses</dt><dd className="font-semibold text-slate-900">{level._count.courses} courses · {modules} modules</dd></div><div><dt className="text-slate-500">Lessons</dt><dd className="font-semibold text-slate-900">{lessons}</dd></div><div><dt className="text-slate-500">Display</dt><dd className="font-semibold text-slate-900">{level.isPublished ? "Visible" : "Hidden"}</dd></div></dl>
            <div className={`rounded-xl border px-3 py-2 text-sm ${missing.length === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="font-semibold">Completeness: </span>{missing.length === 0 ? "ready for publication" : `needs ${missing.join(", ")}`}</div>
            <div className="flex flex-wrap gap-2"><Link href={`/cms/courses?level=${level.code}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Courses</Link><Link href={`/cms/sections?level=${level.code}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Sections</Link><Link href={`/cms/courses/new?level=${level.code}`} className="rounded border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50">Add course</Link><Link href={`/cms/preview/levels/${level.code.toLowerCase()}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Learner preview</Link></div>
            <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => move(level, -1)} disabled={isPending || index === 0} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40" aria-label={`Move ${level.code} up`}>Move up</button><button type="button" onClick={() => move(level, 1)} disabled={isPending || index === orderedLevels.length - 1} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40" aria-label={`Move ${level.code} down`}>Move down</button><button type="button" onClick={() => setEditingId(isEditing ? null : level.id)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50" aria-expanded={isEditing}>Edit details</button></div>
            <CmsLifecycleControls entityType="LANGUAGE_LEVEL" entityId={level.id} status={level.contentStatus} compact />
            {isEditing ? <form onSubmit={(event) => save(event, level)} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-bold text-slate-900">Edit {level.code} <span className="font-normal text-slate-500">(code is fixed)</span></p><label className="text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} maxLength={80} defaultValue={level.title} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Description<textarea name="description" required minLength={10} maxLength={1000} defaultValue={level.description} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Cover image URL<input name="coverImage" type="url" defaultValue={level.coverImage ?? ""} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><details className="rounded-lg border border-blue-100 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-800">SEO metadata</summary><div className="mt-3 grid gap-3"><label className="text-sm font-medium text-slate-700">SEO title<input name="seoTitle" maxLength={70} defaultValue={level.seoTitle ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">SEO description<textarea name="seoDescription" maxLength={160} defaultValue={level.seoDescription ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">SEO keywords<input name="seoKeywords" maxLength={500} defaultValue={level.seoKeywords ?? ""} placeholder="English, A1, beginner" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div></details><div className="flex gap-2"><button type="submit" disabled={isPending} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Save level"}</button><button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">Cancel</button></div></form> : null}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
