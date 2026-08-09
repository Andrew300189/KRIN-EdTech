"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type LessonItem = {
  id: string;
  title: string;
  type: string;
  order: number;
  contentStatus: string;
  prerequisiteLessonId: string | null;
  requiredPrerequisiteCompletion: number;
  autoUnlockNextLesson: boolean;
  _count: { blocks: number };
};

type ModuleTarget = { id: string; title: string; order: number };

async function postJson(url: string, method: "PATCH" | "POST", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Unable to update lessons.");
}

export function CmsLessonOperations({ moduleId, initialLessons, targetModules }: { moduleId: string; initialLessons: LessonItem[]; targetModules: ModuleTarget[] }) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [targetModuleByLesson, setTargetModuleByLesson] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reorder(sourceId: string, destinationId: string) {
    if (sourceId === destinationId) return;
    const previous = lessons;
    const next = [...lessons];
    const source = next.findIndex((lesson) => lesson.id === sourceId);
    const destination = next.findIndex((lesson) => lesson.id === destinationId);
    if (source < 0 || destination < 0) return;
    const [moved] = next.splice(source, 1);
    next.splice(destination, 0, moved);
    const ordered = next.map((lesson, index) => ({ ...lesson, order: index + 1 }));
    setLessons(ordered);
    setMessage(null);
    startTransition(async () => {
      try {
        await postJson("/api/admin/cms/lessons/reorder", "PATCH", { moduleId, lessonIds: ordered.map((lesson) => lesson.id) });
        setMessage("Lesson order saved.");
        router.refresh();
      } catch (error) {
        setLessons(previous);
        setMessage(error instanceof Error ? error.message : "Unable to reorder lessons.");
      }
    });
  }

  function duplicate(lessonId: string) {
    startTransition(async () => {
      try {
        const targetModuleId = targetModuleByLesson[lessonId] || moduleId;
        await postJson(`/api/admin/cms/lessons/${lessonId}/duplicate`, "POST", { targetModuleId });
        setMessage("Lesson copied as a draft. Learner progress was not copied.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to copy lesson.");
      }
    });
  }

  return <section className="mt-6 space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">Lessons</h2><p className="mt-1 text-sm text-slate-600">Drag lessons to reorder them. A prerequisite can never be placed after the lesson that requires it.</p></div>{isPending ? <span className="text-sm text-slate-500">Saving…</span> : null}</div>{message ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}{lessons.length ? <div className="space-y-3">{lessons.map((lesson) => <article key={lesson.id} draggable onDragStart={() => setDraggedId(lesson.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) reorder(draggedId, lesson.id); setDraggedId(null); }} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${draggedId === lesson.id ? "opacity-60" : ""}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Lesson {lesson.order} · {lesson.type} · {lesson.contentStatus}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{lesson.title}</h3><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{lesson._count.blocks} blocks</span>{lesson.prerequisiteLessonId ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Prerequisite · {lesson.requiredPrerequisiteCompletion}%</span> : null}{lesson.autoUnlockNextLesson ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">Auto next lesson</span> : null}</div></div><div className="flex flex-wrap gap-2"><Link href={`/cms/lessons/${lesson.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Edit</Link><Link href={`/cms/preview/lessons/${lesson.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Preview</Link><CmsLifecycleControls entityType="LESSON" entityId={lesson.id} status={lesson.contentStatus} compact /></div></div><div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"><label className="text-xs font-semibold text-slate-600">Copy to module<select value={targetModuleByLesson[lesson.id] ?? moduleId} onChange={(event) => setTargetModuleByLesson((current) => ({ ...current, [lesson.id]: event.target.value }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"><option value={moduleId}>This module</option>{targetModules.filter((target) => target.id !== moduleId).map((target) => <option key={target.id} value={target.id}>M{target.order}. {target.title}</option>)}</select></label><button type="button" disabled={isPending} onClick={() => duplicate(lesson.id)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Copy</button></div></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No lessons yet. Add the first draft below.</p>}</section>;
}
