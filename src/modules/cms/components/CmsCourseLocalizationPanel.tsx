"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type LocaleSummary = {
  code: string;
  displayName: string;
  nativeName: string;
  isBase: boolean;
  exists: boolean;
  status: string | null;
  translatedUnits: number;
  publishedUnits: number;
};

type Props = { courseId: string; totalUnits: number; locales: LocaleSummary[] };

async function actionRequest(courseId: string, body: unknown) {
  const response = await fetch(`/api/admin/cms/courses/${courseId}/translations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to update course localization.");
}

export function CmsCourseLocalizationPanel({ courseId, totalUnits, locales }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(locale: string, action: "CREATE_DRAFT" | "PUBLISH" | "UNPUBLISH") {
    startTransition(async () => {
      try {
        setMessage(null);
        await actionRequest(courseId, { locale, action });
        if (action === "CREATE_DRAFT") {
          router.push(`/cms/translations?course=${courseId}&locale=${locale}`);
          return;
        }
        setMessage(action === "CREATE_DRAFT" ? `${locale.toUpperCase()} draft created from the English source.` : action === "PUBLISH" ? `${locale.toUpperCase()} is now live.` : `${locale.toUpperCase()} was unpublished.`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update course localization.");
      }
    });
  }

  return <section className="mb-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm" aria-labelledby="course-localization-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Learner content</p><h2 id="course-localization-title" className="mt-1 text-xl font-bold text-slate-950">Course translations</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">English stays the canonical course. A locale draft copies only learner-facing text across {totalUnits} content items; progress, answers, scoring and content order stay shared.</p></div><Link href={`/cms/translations?course=${courseId}`} className="rounded-full border border-violet-200 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">Open translation workspace</Link></div>
    {message ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700" aria-live="polite">{message}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {locales.map((locale) => <article key={locale.code} className={`rounded-2xl border p-4 ${locale.isBase ? "border-slate-200 bg-slate-50" : locale.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50/60" : "border-violet-100 bg-violet-50/40"}`}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{locale.nativeName}</h3><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{locale.code} · {locale.displayName}</p></div><span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase text-slate-600">{locale.isBase ? "Base" : locale.status ?? "Not started"}</span></div>
        <p className="mt-3 text-sm text-slate-600">{locale.isBase ? "Edit source content in the course editor." : `${locale.translatedUnits}/${totalUnits} draft items · ${locale.publishedUnits}/${totalUnits} live`}</p>
        {!locale.isBase ? <div className="mt-3 flex flex-wrap gap-2">{!locale.exists ? <button type="button" disabled={isPending} onClick={() => run(locale.code, "CREATE_DRAFT")} className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">Create draft</button> : <><Link href={`/cms/translations?course=${courseId}&locale=${locale.code}`} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">Edit</Link><button type="button" disabled={isPending} onClick={() => run(locale.code, locale.status === "PUBLISHED" ? "UNPUBLISH" : "PUBLISH")} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">{locale.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button></>}</div> : null}
      </article>)}
    </div>
  </section>;
}
