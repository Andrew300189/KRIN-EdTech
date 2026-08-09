"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type LessonTarget = { id: string; title: string; module: { title: string; course: { title: string } } };
type ExerciseItem = { id: string; order: number; engineKey: string; type: string; question: string; basePoints: number; hintsEnabled: boolean; contentStatus: string; _count?: { attempts: number } };

async function request(url: string, method: "POST" | "PATCH", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Unable to update exercise.");
}

function TargetLessonSelect({ value, onChange, lessons }: { value: string; onChange: (value: string) => void; lessons: LessonTarget[] }) {
  return <label className="text-xs font-semibold text-slate-600">Target lesson<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block max-w-72 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"><option value="">Choose lesson</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.module.course.title} · {lesson.module.title} · {lesson.title}</option>)}</select></label>;
}

export function CmsExerciseBlockOperations({ lessonBlockId, initialExercises, targetLessons }: { lessonBlockId: string; initialExercises: ExerciseItem[]; targetLessons: LessonTarget[] }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [targetByExercise, setTargetByExercise] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const before = exercises;
    const next = [...exercises];
    const source = next.findIndex((item) => item.id === sourceId);
    const target = next.findIndex((item) => item.id === targetId);
    if (source < 0 || target < 0) return;
    const [moved] = next.splice(source, 1);
    next.splice(target, 0, moved);
    const ordered = next.map((item, index) => ({ ...item, order: index + 1 }));
    setExercises(ordered);
    startTransition(async () => {
      try {
        await request("/api/admin/cms/exercises/reorder", "PATCH", { lessonBlockId, exerciseIds: ordered.map((item) => item.id) });
        setMessage("Exercise order saved.");
        router.refresh();
      } catch (error) {
        setExercises(before);
        setMessage(error instanceof Error ? error.message : "Unable to reorder exercises.");
      }
    });
  }

  function runAction(exerciseId: string, action: "duplicate" | "move" | "version") {
    startTransition(async () => {
      try {
        if (action === "version") await request(`/api/admin/cms/exercises/${exerciseId}/version`, "POST", {});
        else {
          const targetLessonId = targetByExercise[exerciseId];
          if (!targetLessonId) throw new Error("Choose a target lesson first.");
          await request(`/api/admin/cms/exercises/${exerciseId}/${action}`, action === "move" ? "PATCH" : "POST", { targetLessonId });
        }
        setMessage(action === "version" ? "New draft version created; the current exercise and its analytics remain intact." : action === "move" ? "Exercise moved. Historical data was preserved when applicable." : "Exercise copied as a draft.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update exercise.");
      }
    });
  }

  return <section className="mt-4 space-y-3">{message ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}{exercises.map((exercise) => <article key={exercise.id} draggable onDragStart={() => setDraggedId(exercise.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) reorder(draggedId, exercise.id); setDraggedId(null); }} className={`rounded-xl border border-slate-200 bg-white p-4 ${draggedId === exercise.id ? "opacity-60" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{exercise.order}. {exercise.engineKey} · {exercise.type}</p><p className="mt-1 font-medium text-slate-900">{exercise.question}</p><p className="mt-2 text-xs text-slate-500">{exercise.basePoints} points · {exercise.hintsEnabled ? "Hints on" : "Hints off"}{exercise._count ? ` · ${exercise._count.attempts} attempts` : ""}</p></div><div className="flex flex-wrap gap-2"><Link href={`/cms/exercises/${exercise.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Edit</Link><Link href={`/cms/preview/exercises/${exercise.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Student preview</Link><CmsLifecycleControls entityType="EXERCISE" entityId={exercise.id} status={exercise.contentStatus} compact /></div></div><div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"><TargetLessonSelect value={targetByExercise[exercise.id] ?? ""} onChange={(value) => setTargetByExercise((current) => ({ ...current, [exercise.id]: value }))} lessons={targetLessons} /><button type="button" disabled={isPending} onClick={() => runAction(exercise.id, "duplicate")} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Copy</button><button type="button" disabled={isPending} onClick={() => runAction(exercise.id, "move")} className="rounded border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50">Move</button><button type="button" disabled={isPending} onClick={() => runAction(exercise.id, "version")} className="rounded border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">New version</button></div></article>)}{isPending ? <p className="text-sm text-slate-500">Saving…</p> : null}</section>;
}

export function CmsExerciseBulkWorkspace({ initialExercises }: { initialExercises: ExerciseItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [points, setPoints] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function bulk(body: { basePoints?: number; hintsEnabled?: boolean }) {
    if (!selected.length) return;
    startTransition(async () => {
      try {
        await request("/api/admin/cms/exercises/bulk", "PATCH", { exerciseIds: selected, ...body });
        setMessage("Selected exercises updated.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update exercises."); }
    });
  }
  return <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">Exercise library</h2><p className="mt-1 text-sm text-slate-600">Select exercises to change points or hint visibility in one audited operation.</p></div>{selected.length ? <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{selected.length} selected</span> : null}</div>{selected.length ? <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"><label className="text-sm font-semibold text-slate-800">Points<input value={points} onChange={(event) => setPoints(Math.max(0, Number(event.target.value) || 0))} type="number" min="0" max="1000" className="mt-1 block w-28 rounded border border-slate-300 bg-white px-2 py-1.5" /></label><button type="button" disabled={isPending} onClick={() => bulk({ basePoints: points })} className="rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Set points</button><button type="button" disabled={isPending} onClick={() => bulk({ hintsEnabled: true })} className="rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Enable hints</button><button type="button" disabled={isPending} onClick={() => bulk({ hintsEnabled: false })} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Disable hints</button><button type="button" onClick={() => setSelected([])} className="text-sm font-semibold text-slate-600 underline">Clear</button></div> : null}{message ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}<div className="space-y-3">{initialExercises.map((exercise) => <article key={exercise.id} className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"><input aria-label={`Select ${exercise.question}`} type="checkbox" checked={selected.includes(exercise.id)} onChange={() => toggle(exercise.id)} className="mt-1 h-4 w-4" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-blue-700">{exercise.engineKey} · {exercise.type}</p><Link href={`/cms/exercises/${exercise.id}`} className="mt-1 block font-bold text-slate-950 hover:text-blue-700">{exercise.question}</Link><p className="mt-1 text-sm text-slate-600">{exercise.basePoints} points · {exercise.hintsEnabled ? "Hints on" : "Hints off"}</p></div><Link href={`/cms/preview/exercises/${exercise.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Preview</Link></article>)}</div></section>;
}
