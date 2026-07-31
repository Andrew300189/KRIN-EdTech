"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Word = { id: string; lemma: string; meanings: Array<{ translation: string | null; definition: string }> };
type LinkedWord = { wordId: string; role: string; isRequired: boolean; order: number; word: Word };

export function LessonVocabularyManager({ lessonId, initial }: { lessonId: string; initial: LinkedWord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Word[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState("NEW");
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setMatches([]); return; }
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/vocabulary?q=${encodeURIComponent(query)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((payload: { data?: Word[] } | null) => setMatches(payload?.data ?? []))
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function link(wordId: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/vocabulary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wordId, role, isRequired }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to link word");
      setQuery(""); setMatches([]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to link word"); } finally { setBusy(false); }
  }

  async function unlink(wordId: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/vocabulary/${wordId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to remove word");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove word"); } finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Lesson vocabulary</h2><p className="mt-1 text-sm text-slate-600">Search the central dictionary and link entries to this lesson.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search word…" className="md:col-span-2 w-full rounded-lg border border-slate-300 px-3 py-2" /><select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{["NEW", "REVIEW", "OPTIONAL", "HOMEWORK", "PHRASE_OF_THE_DAY"].map((value) => <option key={value}>{value}</option>)}</select></div><label className="mt-3 inline-flex items-center gap-2 text-sm"><input checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" /> Required for this lesson</label>{matches.length ? <div className="mt-3 flex flex-wrap gap-2">{matches.map((word) => <button key={word.id} type="button" disabled={busy} onClick={() => void link(word.id)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm hover:bg-blue-100"><span className="font-semibold">{word.lemma}</span><span className="ml-2 text-slate-600">{word.meanings[0]?.translation ?? word.meanings[0]?.definition}</span></button>)}</div> : null}<ul className="mt-5 space-y-2">{initial.map((item) => <li key={item.wordId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span><span className="font-semibold">{item.order}. {item.word.lemma}</span><span className="ml-2 text-xs text-slate-600">{item.role}{item.isRequired ? " · required" : ""}</span></span><button type="button" disabled={busy} onClick={() => void unlink(item.wordId)} className="text-sm font-semibold text-red-700 hover:underline">Remove</button></li>)}</ul>{initial.length === 0 ? <p className="mt-4 text-sm text-slate-600">No words have been linked yet.</p> : null}{message ? <p role="alert" className="mt-3 text-sm text-red-700">{message}</p> : null}</section>;
}
