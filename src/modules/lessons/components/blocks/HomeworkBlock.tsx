"use client";

import { useState } from "react";
import Link from "next/link";
import { displayContent, type LessonBlock } from "../lesson-content";

export function HomeworkBlock({ block, canSaveProgress }: { block: LessonBlock; canSaveProgress: boolean }) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const text = displayContent(block.content);
  async function save(submit: boolean) {
    setSaving(true); setStatus(null);
    try {
      const response = await fetch(`/api/learning/blocks/${block.id}/homework`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { response: answer }, submit }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save homework");
      setStatus(submit ? "Homework submitted." : "Draft saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save homework"); } finally { setSaving(false); }
  }
  return <div className="mt-4">{text ? <p className="whitespace-pre-wrap leading-7 text-slate-700">{text}</p> : null}{canSaveProgress ? <><label className="mt-4 block text-sm font-medium text-slate-800">Your work<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Write your answer…" /></label><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => void save(false)} disabled={saving} className="rounded-lg border border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">Save draft</button><button type="button" onClick={() => void save(true)} disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">Submit homework</button><Link href="/profile/homework" className="self-center text-sm font-semibold text-blue-700 hover:underline">My homework</Link></div>{status ? <p role="status" className="mt-3 text-sm text-slate-700">{status}</p> : null}</> : <p className="mt-4 text-sm text-slate-600">Sign in to save homework.</p>}</div>;
}
