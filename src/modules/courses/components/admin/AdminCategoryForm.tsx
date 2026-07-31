"use client";

import { useState, type FormEvent } from "react";

export function AdminCategoryForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setStatus(null);
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: data.get("slug"), title: data.get("title"), description: data.get("description") || undefined, icon: data.get("icon") || undefined, isPublished: data.get("isPublished") === "on" }) });
      const payload = await response.json() as { error?: string; data?: { title: string } };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create category");
      form.reset(); setStatus(`Created ${payload.data?.title ?? "category"}. Refresh to see it in the list.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to create category"); } finally { setSaving(false); }
  }
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"><h2 className="md:col-span-2 text-xl font-bold">Add course category</h2><label className="text-sm font-medium">Title<input name="title" required minLength={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="business-english" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Icon<input name="icon" maxLength={24} placeholder="💼" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="flex items-end gap-2 pb-2 text-sm font-medium"><input name="isPublished" type="checkbox" /> Publish</label><label className="md:col-span-2 text-sm font-medium">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Add category"}</button>{status ? <p className="mt-3 text-sm text-slate-700" role="status">{status}</p> : null}</div></form>;
}
