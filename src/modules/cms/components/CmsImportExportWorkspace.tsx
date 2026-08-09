"use client";

import { FormEvent, useState, useTransition } from "react";

export function CmsImportExportWorkspace() {
  const [documentText, setDocumentText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function exportCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const courseId = String(new FormData(event.currentTarget).get("courseId") ?? "").trim();
    if (!courseId) {
      setMessage("Enter a course ID to export.");
      return;
    }
    window.location.assign(`/api/admin/cms/content/COURSE/${encodeURIComponent(courseId)}/export`);
  }

  function importCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setMessage(null);
      try {
        const document = JSON.parse(documentText) as unknown;
        const response = await fetch("/api/admin/cms/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(document),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to import the course.");
        setDocumentText("");
        setMessage("Course imported as a draft. Review its structure before publishing.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "The import document is invalid.");
      }
    });
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <form onSubmit={exportCourse} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">Export course</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Exports the complete course structure as a versioned JSON document. The export endpoint is owner-only and never includes learner data.</p>
      <label className="mt-4 block text-sm font-medium text-slate-700">Course ID<input name="courseId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="c..." /></label>
      <button type="submit" className="mt-4 rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">Download JSON</button>
    </form>
    <form onSubmit={importCourse} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">Import course</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Only an export from this CMS is accepted. Imported content always starts as a draft.</p>
      <label className="mt-4 block text-sm font-medium text-slate-700">Course JSON<textarea value={documentText} onChange={(event) => setDocumentText(event.target.value)} required className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" placeholder='{ "kind": "krin-course" }' /></label>
      <button type="submit" disabled={isPending} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{isPending ? "Importing…" : "Import draft"}</button>
    </form>
    {message ? <p role="status" className="lg:col-span-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
  </div>;
}
