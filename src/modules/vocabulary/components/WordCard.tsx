"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";

type Meaning = { definition: string; translation: string | null; article: string | null; usageLabel: string | null; context: string | null };
type WordCardItem = {
  id: string;
  kind: "GLOBAL" | "CUSTOM";
  status: string;
  masteryLevel: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: Date | string | null;
  isDifficult?: boolean;
  word?: {
    lemma: string;
    partOfSpeech: string | null;
    britishTranscription: string | null;
    americanTranscription: string | null;
    britishAudioUrl: string | null;
    americanAudioUrl: string | null;
    meanings: Meaning[];
    examples?: Array<{ sentence: string; translation: string | null }>;
    collocations?: Array<{ value: string; translation: string | null }>;
    sourceRelations?: Array<{ type: string; targetWord: { lemma: string } }>;
  } | null;
  term?: string;
  translation?: string;
  partOfSpeech?: string | null;
  example?: string | null;
  sourceLesson?: { title: string; module: { course: { title: string } } } | null;
};

function dateLabel(value: Date | string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function WordCard({ item }: { item: WordCardItem }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const word = item.word;
  const title = word?.lemma ?? item.term ?? "Word";
  const meanings = word?.meanings ?? [{ definition: item.translation ?? "", translation: item.translation ?? null, article: null, usageLabel: null, context: item.example ?? null }];
  const main = meanings[0];
  const relations = word?.sourceRelations ?? [];

  async function action(actionType: "ARCHIVE" | "RESTORE" | "DIFFICULT" | "NOT_DIFFICULT") {
    setBusy(true);
    try {
      const response = await fetch(`/api/profile/vocabulary/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, action: actionType }),
      });
      if (response.ok) window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeCustomWord() {
    setBusy(true);
    try {
      const response = await fetch(`/api/profile/vocabulary/${item.id}`, { method: "DELETE" });
      if (response.ok) window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  function play(url: string | null) {
    if (url) void new Audio(url).play();
  }

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-medium text-blue-700">{word?.partOfSpeech ?? item.partOfSpeech ?? "—"}</p>
      </div>
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{item.status}</span>
    </div>
    <p className="mt-4 text-lg text-slate-900">{main.article ? `${main.article} ` : ""}{main.translation ?? main.definition}</p>
    {main.context ? <p className="mt-2 text-sm italic text-slate-600">{main.context}</p> : null}
    {word?.britishTranscription || word?.americanTranscription ? <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <span>Br: {word.britishTranscription ?? "—"}</span>
      <button type="button" onClick={() => play(word.britishAudioUrl)} disabled={!word.britishAudioUrl} className="rounded border px-2 py-1 disabled:opacity-40" aria-label={`Play British pronunciation of ${title}`}>▶</button>
      <span>Am: {word.americanTranscription ?? "—"}</span>
      <button type="button" onClick={() => play(word.americanAudioUrl)} disabled={!word.americanAudioUrl} className="rounded border px-2 py-1 disabled:opacity-40" aria-label={`Play American pronunciation of ${title}`}>▶</button>
    </div> : null}
    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
      <div><dt>Mastery</dt><dd className="font-semibold text-slate-900">{item.masteryLevel}%</dd></div>
      <div><dt>Next review</dt><dd className="font-semibold text-slate-900">{dateLabel(item.nextReviewAt)}</dd></div>
      <div><dt>Correct / incorrect</dt><dd className="font-semibold text-slate-900">{item.correctCount} / {item.incorrectCount}</dd></div>
      <div><dt>Source</dt><dd className="font-semibold text-slate-900">{item.sourceLesson ? item.sourceLesson.module.course.title : item.kind === "CUSTOM" ? "My word" : "Dictionary"}</dd></div>
    </dl>
    {expanded ? <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
      {meanings.slice(1).map((meaning, index) => <div key={`${meaning.definition}-${index}`}><p className="font-medium text-slate-900">{meaning.translation ?? meaning.definition}</p><p className="text-sm text-slate-600">{meaning.definition}</p></div>)}
      {word?.examples?.length ? <div><h3 className="font-semibold">Examples</h3>{word.examples.map((example) => <p key={example.sentence} className="mt-1 text-sm text-slate-600">{example.sentence}{example.translation ? ` — ${example.translation}` : ""}</p>)}</div> : null}
      {relations.length ? <div><h3 className="font-semibold">Related words</h3><p className="mt-1 text-sm text-slate-600">{relations.map((relation) => `${relation.type.toLowerCase()}: ${relation.targetWord.lemma}`).join(" · ")}</p></div> : null}
      {word?.collocations?.length ? <div><h3 className="font-semibold">Collocations</h3><p className="mt-1 text-sm text-slate-600">{word.collocations.map((collocation) => collocation.value).join(" · ")}</p></div> : null}
    </div> : null}
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="text-sm font-semibold text-blue-700 hover:underline">{expanded ? "Hide details" : "Show all meanings"}</button>
      <Link href="/profile/vocabulary/training" className="text-sm font-semibold text-blue-700 hover:underline">Train</Link>
      {item.status === "ARCHIVED" ? <button type="button" disabled={busy} onClick={() => void action("RESTORE")} className="text-sm font-semibold text-emerald-700 hover:underline">Restore</button> : <button type="button" disabled={busy} onClick={() => void action("ARCHIVE")} className="text-sm font-semibold text-slate-700 hover:underline">Archive</button>}
      <button type="button" disabled={busy} onClick={() => void action(item.isDifficult ? "NOT_DIFFICULT" : "DIFFICULT")} className="text-sm font-semibold text-amber-700 hover:underline">{item.isDifficult ? "Not difficult" : "Mark difficult"}</button>
      {item.kind === "CUSTOM" ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-red-700 hover:underline">Delete</button> : null}
    </div>
    <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete “${title}”?`} description="This permanently removes your private word and cannot be undone." confirmLabel="Delete word" onConfirm={() => void removeCustomWord()} isProcessing={busy} />
  </article>;
}
