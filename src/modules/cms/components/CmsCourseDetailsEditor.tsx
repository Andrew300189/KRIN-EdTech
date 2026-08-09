"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Feedback = { message: string; error?: boolean } | null;

async function saveJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to save changes.");
}

export function CmsCourseDetailsEditor({ course }: { course: { id: string; title: string; shortDescription: string; fullDescription: string | null; coverImage: string | null; estimatedDuration: number } }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        await saveJson(`/api/admin/courses/${course.id}`, { title: form.get("title"), shortDescription: form.get("shortDescription"), fullDescription: form.get("fullDescription"), coverImage: form.get("coverImage"), estimatedDuration: Number(form.get("estimatedDuration") || 0) });
        setExpanded(false);
        setFeedback({ message: "Course details saved." });
        router.refresh();
      } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Unable to save course details.", error: true }); }
    });
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Course details</h2><p className="mt-1 text-sm text-slate-600">Edit the course shown inside its selected CEFR level.</p></div><button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50" aria-expanded={expanded}>{expanded ? "Close editor" : "Edit course"}</button></div>{expanded ? <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2"><label className="md:col-span-2 text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} defaultValue={course.title} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium text-slate-700">Short description<textarea name="shortDescription" required minLength={10} defaultValue={course.shortDescription} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium text-slate-700">Full description<textarea name="fullDescription" defaultValue={course.fullDescription ?? ""} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Cover image URL<input name="coverImage" type="url" defaultValue={course.coverImage ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Estimated minutes<input name="estimatedDuration" type="number" min="0" defaultValue={course.estimatedDuration} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Save course"}</button></div></form> : null}{feedback ? <p role="status" className={`mt-3 text-sm ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}</section>;
}

export function CmsModuleDetailsEditor({ module, availableModules }: {
  module: { id: string; title: string; description: string | null; isRequired: boolean; requiresSequentialCompletion: boolean; unlockAfterModuleId: string | null; requiredCompletionPercent: number };
  availableModules: Array<{ id: string; title: string; order: number }>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        await saveJson(`/api/admin/modules/${module.id}`, {
          title: form.get("title"),
          description: form.get("description"),
          isRequired: form.get("isRequired") === "on",
          requiresSequentialCompletion: form.get("requiresSequentialCompletion") === "on",
          unlockAfterModuleId: String(form.get("unlockAfterModuleId") || "") || null,
          requiredCompletionPercent: Number(form.get("requiredCompletionPercent") || 100),
        });
        setExpanded(false);
        setFeedback({ message: "Module saved." });
        router.refresh();
      } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Unable to save module.", error: true }); }
    });
  }

  return <div className="mt-3"><button type="button" onClick={() => setExpanded((value) => !value)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50" aria-expanded={expanded}>{expanded ? "Close module editor" : "Edit module"}</button>{expanded ? <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 md:grid-cols-2"><label className="md:col-span-2 text-sm font-medium text-slate-700">Module title<input name="title" required minLength={2} defaultValue={module.title} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" defaultValue={module.description ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isRequired" type="checkbox" defaultChecked={module.isRequired} />Required module</label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="requiresSequentialCompletion" type="checkbox" defaultChecked={module.requiresSequentialCompletion} />Require previous module completion</label><label className="text-sm font-medium text-slate-700">Unlock after module<select name="unlockAfterModuleId" defaultValue={module.unlockAfterModuleId ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">No explicit prerequisite</option>{availableModules.filter((item) => item.id !== module.id).map((item) => <option key={item.id} value={item.id}>{item.order}. {item.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Required prerequisite completion (%)<input name="requiredCompletionPercent" type="number" min="1" max="100" defaultValue={module.requiredCompletionPercent} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><p className="md:col-span-2 text-xs text-slate-600">The completion percentage is checked against every selected prerequisite. Explicit prerequisites must remain before this module.</p><button disabled={isPending} className="w-fit rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Save module"}</button></form> : null}{feedback ? <p role="status" className={`mt-2 text-xs ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}</div>;
}
