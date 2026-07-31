"use client";

import { useState } from "react";
import { AddToDictionaryButton } from "./AddToDictionaryButton";

export function InteractiveWord({ word, sourceLessonId }: { word: { id: string; lemma: string; partOfSpeech: string | null; britishTranscription: string | null; meanings: Array<{ translation: string | null; definition: string; article: string | null }> }; sourceLessonId?: string }) {
  const [open, setOpen] = useState(false);
  const meaning = word.meanings[0];
  return <span className="relative inline"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="rounded px-0.5 font-semibold text-blue-700 underline decoration-dotted underline-offset-4 focus:outline-none focus:ring-2 focus:ring-blue-500">{word.lemma}</button>{open ? <span role="dialog" className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm shadow-lg"><span className="block font-bold text-slate-900">{word.lemma}</span><span className="block text-slate-600">{word.partOfSpeech ?? "—"} · {word.britishTranscription ?? "—"}</span><span className="mt-2 block text-slate-700">{meaning?.article ? `${meaning.article} ` : ""}{meaning?.translation ?? meaning?.definition}</span><span className="mt-3 block"><AddToDictionaryButton compact wordId={word.id} sourceLessonId={sourceLessonId} /></span></span> : null}</span>;
}
