"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type ContentSlot = {
  id: string;
  key: string;
  area: string;
  title: string;
  content: unknown;
  contentStatus: string;
  scheduledAt: string | Date | null;
  updatedAt: string | Date;
};

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function CmsContentSlotsWorkspace({ initialSlots }: { initialSlots: ContentSlot[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let content: unknown;
    try {
      content = JSON.parse(String(form.get("content") || "{}"));
    } catch {
      setMessage("Content must be valid JSON.");
      return;
    }

    const payload = {
      key: form.get("key"),
      area: form.get("area"),
      title: form.get("title"),
      content,
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/cms/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { data?: ContentSlot; error?: string };
      if (!response.ok || !data.data) {
        setMessage(data.error ?? "Unable to create the content slot.");
        return;
      }

      setSlots((current) => [...current, data.data!]);
      event.currentTarget.reset();
      setMessage("Content slot created as a draft.");
      router.refresh();
    });
  }

  return <section className="space-y-7">
    <header>
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Page slots</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-950">Homepage, dashboard and trust content</h1>
      <p className="mt-2 max-w-3xl text-slate-600">A slot contains structured JSON for a specific location. It follows the same draft, preview and publication flow as a course and never executes HTML or scripts. Legal content is published only when the platform owner supplies verified information.</p>
    </header>

    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-sm font-medium">Key<input name="key" required pattern="[a-z0-9]+([.-][a-z0-9]+)*" placeholder="home.hero" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium">Area<select name="area" defaultValue="HOME" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="HOME">Homepage</option><option value="STUDENT_DASHBOARD">Student dashboard</option><option value="TEACHER_DASHBOARD">Teacher dashboard</option><option value="LEGAL">Legal and trust</option></select></label>
      <label className="md:col-span-2 text-sm font-medium">Title<input name="title" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium">Structured content (JSON)<textarea name="content" defaultValue={'{\n  "heading": "",\n  "body": "",\n  "ctaLabel": "",\n  "ctaHref": "/courses"\n}'} className="mt-1 min-h-48 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" /></label>
      <div className="md:col-span-2"><button type="submit" disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Create draft slot</button></div>
    </form>

    {message ? <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
    <div className="space-y-4">
      {slots.map((slot) => <article key={slot.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{slot.area} · {slot.contentStatus}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{slot.title}</h2><p className="mt-1 font-mono text-xs text-slate-500">{slot.key}</p></div><CmsLifecycleControls entityType="CONTENT_SLOT" entityId={slot.id} status={slot.contentStatus} /></div><pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100"><code>{prettyJson(slot.content)}</code></pre></article>)}
      {slots.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">No managed slots have been created.</p> : null}
    </div>
  </section>;
}
