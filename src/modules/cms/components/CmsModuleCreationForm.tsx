"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CmsModuleCreationForm({ courseId, availableModules }: { courseId: string; availableModules: Array<{ id: string; title: string; order: number }> }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            description: form.get("description") || undefined,
            isRequired: form.get("isRequired") === "on",
            requiresSequentialCompletion: form.get("requiresSequentialCompletion") === "on",
            unlockAfterModuleId: String(form.get("unlockAfterModuleId") || "") || null,
            requiredCompletionPercent: Number(form.get("requiredCompletionPercent") || 100),
          }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to create module.");
        event.currentTarget.reset();
        setMessage("Module created as a draft. Add lessons, then publish it or its parent course.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create module."); }
    });
  }

  return <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-lg font-bold text-slate-950">Add module</h2><p className="mt-1 text-sm text-slate-600">New modules always start as drafts, so unfinished content cannot become visible.</p></div><label className="md:col-span-2 text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isRequired" type="checkbox" defaultChecked />Required module</label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="requiresSequentialCompletion" type="checkbox" />Require previous module completion</label><label className="text-sm font-medium text-slate-700">Unlock after module<select name="unlockAfterModuleId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">No explicit prerequisite</option>{availableModules.map((courseModule) => <option key={courseModule.id} value={courseModule.id}>{courseModule.order}. {courseModule.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Required prerequisite completion (%)<input name="requiredCompletionPercent" type="number" min="1" max="100" defaultValue="100" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><div className="md:col-span-2"><button disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Creating…" : "Create module"}</button>{message ? <p role="status" className="mt-2 text-sm text-slate-700">{message}</p> : null}</div></form>;
}
