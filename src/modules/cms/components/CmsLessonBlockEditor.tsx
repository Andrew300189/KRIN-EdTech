"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Block = { id: string; title: string | null; content: unknown; settings: unknown; isRequired: boolean };

function stringifyJson(value: unknown) {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

export function CmsLessonBlockEditor({ block, orderedBlockIds }: { block: Block; orderedBlockIds: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const index = orderedBlockIds.indexOf(block.id);

  function request(url: string, method: "POST" | "PATCH" | "PUT", body?: object) {
    return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to update lesson block.");
      });
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const contentText = String(form.get("content") ?? "").trim();
        const settingsText = String(form.get("settings") ?? "").trim();
        await request(`/api/admin/blocks/${block.id}`, "PATCH", {
          title: String(form.get("title") ?? "").trim() || undefined,
          content: contentText ? JSON.parse(contentText) : null,
          settings: settingsText ? JSON.parse(settingsText) : null,
          isRequired: form.get("isRequired") === "on",
        });
        setEditing(false); setMessage("Block saved as a new audited revision."); router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Content and settings must be valid JSON."); }
    });
  }

  function reorder(direction: -1 | 1) {
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedBlockIds.length) return;
    const next = [...orderedBlockIds]; [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      try { await request("/api/admin/cms/content/LESSON_BLOCK/reorder", "PUT", { orderedIds: next }); setMessage("Block order saved."); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Unable to reorder blocks."); }
    });
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    <div className="flex flex-wrap gap-2"><button type="button" disabled={isPending} onClick={() => setEditing((value) => !value)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">{editing ? "Close editor" : "Edit content"}</button><button type="button" disabled={isPending} onClick={() => startTransition(async () => { try { await request(`/api/admin/blocks/${block.id}`, "POST"); setMessage("Draft copy created."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to copy block."); } })} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Copy as draft</button><button type="button" disabled={isPending || index === 0} onClick={() => reorder(-1)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Move up</button><button type="button" disabled={isPending || index === orderedBlockIds.length - 1} onClick={() => reorder(1)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Move down</button></div>
    {editing ? <form onSubmit={save} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4"><label className="text-sm font-medium text-slate-800">Title<input name="title" defaultValue={block.title ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-800">Content JSON<textarea name="content" defaultValue={stringifyJson(block.content)} className="mt-1 min-h-28 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-xs" /></label><label className="text-sm font-medium text-slate-800">Settings JSON<textarea name="settings" defaultValue={stringifyJson(block.settings)} className="mt-1 min-h-20 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-xs" /></label><label className="text-sm font-medium text-slate-800"><input name="isRequired" type="checkbox" defaultChecked={block.isRequired} className="mr-2" />Required before lesson completion</label><button disabled={isPending} className="w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save block</button></form> : null}
    {message ? <p role="status" className="mt-2 text-xs text-slate-600">{message}</p> : null}
  </div>;
}
