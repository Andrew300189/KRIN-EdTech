"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type MediaAsset = { id: string; kind: string; url: string; fileName: string; mimeType: string; altText: string | null; caption: string | null; isArchived: boolean; createdAt: string | Date; _count: { links: number } };

export function CmsMediaWorkspace({ initialAssets }: { initialAssets: MediaAsset[] }) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { kind: form.get("kind"), url: form.get("url"), fileName: form.get("fileName"), mimeType: form.get("mimeType"), altText: form.get("altText") || undefined, caption: form.get("caption") || undefined };
    startTransition(async () => {
      const response = await fetch("/api/admin/cms/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { data?: MediaAsset; error?: string };
      if (!response.ok || !data.data) {
        setMessage(data.error ?? "Unable to register media.");
        return;
      }
      setAssets((current) => [{ ...data.data!, _count: { links: 0 } }, ...current]);
      event.currentTarget.reset();
      setMessage("Media metadata saved.");
      router.refresh();
    });
  }

  function archive(assetId: string, isArchived: boolean) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/cms/media/${assetId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Unable to update media.");
        return;
      }
      setAssets((current) => current.map((asset) => asset.id === assetId ? { ...asset, isArchived } : asset));
      setMessage(isArchived ? "Media archived." : "Media restored.");
      router.refresh();
    });
  }

  return <section className="space-y-7"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Media library</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Reusable media assets</h1><p className="mt-2 max-w-3xl text-slate-600">Register files hosted by your approved storage provider. The CMS stores metadata, accessibility text and reuse links; it never exposes write credentials in the browser.</p></header><form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2"><label className="text-sm font-medium">Kind<select name="kind" defaultValue="IMAGE" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium">File name<input name="fileName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">HTTPS media URL<input name="url" type="url" required placeholder="https://cdn.example.com/media/lesson-image.webp" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">MIME type<input name="mimeType" required placeholder="image/webp" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Alternative text<input name="altText" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Caption<textarea name="caption" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button type="submit" disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Register media</button></div></form>{message ? <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className={`rounded-2xl border bg-white p-5 ${asset.isArchived ? "opacity-60" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{asset.kind}</p><h2 className="mt-1 break-all font-semibold text-slate-950">{asset.fileName}</h2></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{asset._count.links} uses</span></div><p className="mt-3 break-all text-xs text-slate-500">{asset.url}</p><p className="mt-3 text-sm text-slate-600">{asset.altText || "No alternative text provided."}</p><div className="mt-4 flex gap-3"><a href={asset.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">Open asset</a><button type="button" disabled={isPending} onClick={() => archive(asset.id, !asset.isArchived)} className="text-sm font-semibold text-slate-700 hover:underline">{asset.isArchived ? "Restore" : "Archive"}</button></div></article>)}{assets.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">No media assets have been registered.</p> : null}</div></section>;
}
