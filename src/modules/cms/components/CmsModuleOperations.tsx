"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type Module = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  requiresSequentialCompletion: boolean;
  unlockAfterModuleId: string | null;
  requiredCompletionPercent: number;
  contentStatus: string;
  lessons: Array<{ id: string; title: string; order: number; contentStatus: string }>;
};

async function request(url: string, method: "PATCH" | "POST", body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to update module.");
}

export function CmsModuleOperations({ courseId, initialModules, courses }: { courseId: string; initialModules: Module[]; courses: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetCourseByModule, setTargetCourseByModule] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reorder(draggedModuleId: string, targetModuleId: string) {
    if (draggedModuleId === targetModuleId) return;
    const sourceIndex = modules.findIndex((module) => module.id === draggedModuleId);
    const targetIndex = modules.findIndex((module) => module.id === targetModuleId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...modules];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const ordered = next.map((module, index) => ({ ...module, order: index + 1 }));
    setModules(ordered);
    setMessage(null);
    startTransition(async () => {
      try {
        await request("/api/admin/cms/modules/reorder", "PATCH", { courseId, moduleIds: ordered.map((module) => module.id) });
        setMessage("Module order saved.");
        router.refresh();
      } catch (error) {
        setModules(initialModules);
        setMessage(error instanceof Error ? error.message : "Unable to reorder modules.");
      }
    });
  }

  function duplicate(moduleId: string) {
    startTransition(async () => {
      try {
        await request(`/api/admin/cms/modules/${moduleId}/duplicate`, "POST", { targetCourseId: targetCourseByModule[moduleId] || undefined });
        setMessage("Module copy created as a draft.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to copy module."); }
    });
  }

  function move(moduleId: string) {
    const targetCourseId = targetCourseByModule[moduleId];
    if (!targetCourseId || targetCourseId === courseId) { setMessage("Choose another destination course before moving this module."); return; }
    startTransition(async () => {
      try {
        await request(`/api/admin/cms/modules/${moduleId}/move`, "PATCH", { targetCourseId });
        setMessage("Module moved as a draft; review its publication state in the destination course.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to move module."); }
    });
  }

  return <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">Modules and lessons</h2><p className="mt-1 text-sm text-slate-600">Drag modules to change learner order. A prerequisite can never be moved after the module that needs it.</p></div>{isPending ? <span className="text-sm text-slate-500">Saving…</span> : null}</div>{message ? <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}<div className="space-y-4">{modules.map((module) => <article key={module.id} draggable onDragStart={() => setDraggedId(module.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) reorder(draggedId, module.id); setDraggedId(null); }} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${draggedId === module.id ? "opacity-60" : ""}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Module {module.order} · {module.contentStatus}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{module.title}</h3><p className="mt-1 text-sm text-slate-600">{module.description ?? "No module description."}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{module.isRequired ? "Required" : "Optional"}</span>{module.requiresSequentialCompletion ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Previous module required</span> : null}{module.unlockAfterModuleId ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Explicit prerequisite · {module.requiredCompletionPercent}%</span> : null}</div></div><div className="flex flex-wrap gap-2"><Link href={`/cms/modules/${module.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Open</Link><Link href={`/cms/preview/modules/${module.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Preview</Link><CmsLifecycleControls entityType="COURSE_MODULE" entityId={module.id} status={module.contentStatus} compact /></div></div><ol className="mt-4 space-y-2">{module.lessons.length ? module.lessons.map((lesson) => <li key={lesson.id}><Link href={`/cms/lessons/${lesson.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50">{lesson.order}. {lesson.title} <span className="text-xs font-normal text-slate-500">· {lesson.contentStatus}</span></Link></li>) : <li className="text-sm text-slate-500">No lessons in this module.</li>}</ol><div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"><label className="text-xs font-semibold text-slate-600">Destination course<select value={targetCourseByModule[module.id] ?? courseId} onChange={(event) => setTargetCourseByModule((current) => ({ ...current, [module.id]: event.target.value }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"><option value={courseId}>This course</option>{courses.filter((course) => course.id !== courseId).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button type="button" disabled={isPending} onClick={() => duplicate(module.id)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Copy</button><button type="button" disabled={isPending} onClick={() => move(module.id)} className="rounded border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50">Move</button></div></article>)}</div></section>;
}
