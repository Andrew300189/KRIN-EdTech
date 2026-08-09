"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Template = { id: string; title: string; description: string | null; engineKey: string; type: string; isArchived: boolean };
type Lesson = { id: string; title: string; module: { title: string; course: { title: string } } };

export function CmsExerciseTemplateLibrary({ templates, lessons }: { templates: Template[]; lessons: Lesson[] }) {
  const router = useRouter();
  const [targetByTemplate, setTargetByTemplate] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function instantiate(templateId: string) {
    const targetLessonId = targetByTemplate[templateId];
    if (!targetLessonId) { setMessage("Choose a target lesson first."); return; }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cms/exercise-templates/${templateId}/instantiate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetLessonId }) });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to create exercise from template.");
        setMessage("Draft exercise created from template.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create exercise from template."); }
    });
  }
  return <section className="mt-8"><h2 className="text-2xl font-bold text-slate-950">Saved exercise templates</h2><p className="mt-1 text-sm text-slate-600">Templates are reusable configurations, separate from the static engine catalogue below.</p>{message ? <p role="status" className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}{templates.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{templates.map((template) => <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-blue-700">{template.engineKey} · {template.type}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{template.title}</h3>{template.description ? <p className="mt-2 text-sm text-slate-600">{template.description}</p> : null}<label className="mt-4 block text-xs font-semibold text-slate-600">Create in lesson<select value={targetByTemplate[template.id] ?? ""} onChange={(event) => setTargetByTemplate((current) => ({ ...current, [template.id]: event.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"><option value="">Choose lesson</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.module.course.title} · {lesson.module.title} · {lesson.title}</option>)}</select></label><button type="button" disabled={isPending} onClick={() => instantiate(template.id)} className="mt-3 rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Create draft from template</button></article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No saved templates yet. Save one from an exercise editor.</p>}</section>;
}
