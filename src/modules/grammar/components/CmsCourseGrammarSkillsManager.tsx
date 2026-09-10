"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type GrammarSkill = { id: string; title: string; slug: string; description: string | null };

async function request(url: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Unable to save grammar skills.");
}

export function CmsCourseGrammarSkillsManager({ courseId, initial }: { courseId: string; initial: GrammarSkill[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await request(`/api/admin/courses/${courseId}/grammar-skills`, "POST", { title: form.get("title"), slug: form.get("slug") || undefined, description: form.get("description") || undefined });
        event.currentTarget.reset();
        setMessage("Grammar skill created.");
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create grammar skill."); }
    });
  }

  function remove(skill: GrammarSkill) {
    startTransition(async () => {
      try {
        await request(`/api/admin/courses/${courseId}/grammar-skills/${skill.id}`, "DELETE");
        setMessage(`Removed ${skill.title}.`);
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete grammar skill."); }
    });
  }

  return <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Grammar curriculum</p><h2 className="mt-1 text-xl font-bold text-slate-950">Measurable grammar skills</h2><p className="mt-1 text-sm text-slate-600">Create outcomes first, then link them to lessons, learning fragments and exercises. Publication checks the links automatically.</p></div><form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Skill title<input name="title" required minLength={2} placeholder="Present Simple: do / does" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Slug<input name="slug" placeholder="present-simple-do-does" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono" /></label><label className="text-sm font-medium text-slate-700">Short description<input name="description" placeholder="Question and negative auxiliaries" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><div className="md:col-span-3"><button disabled={isPending} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Add grammar skill"}</button></div></form>{initial.length ? <ul className="mt-5 grid gap-2 md:grid-cols-2">{initial.map((skill) => <li key={skill.id} className="flex items-start justify-between gap-3 rounded-xl border border-violet-100 bg-white p-3"><div><p className="font-semibold text-slate-900">{skill.title}</p><p className="text-xs text-slate-500">{skill.slug}{skill.description ? ` · ${skill.description}` : ""}</p></div><button type="button" onClick={() => remove(skill)} disabled={isPending} className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Delete</button></li>)}</ul> : <p className="mt-4 text-sm text-slate-600">No grammar skills yet.</p>}{message ? <p role="status" className="mt-3 text-sm text-slate-700">{message}</p> : null}</section>;
}
