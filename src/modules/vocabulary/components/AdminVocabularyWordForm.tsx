"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const partsOfSpeech = ["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PREPOSITION", "CONJUNCTION", "DETERMINER", "NUMERAL", "INTERJECTION", "PHRASE", "PHRASAL_VERB", "IDIOM", "OTHER"];

export function AdminVocabularyWordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      lemma: String(form.get("lemma") ?? ""),
      partOfSpeech: String(form.get("partOfSpeech") || "") || undefined,
      cefrLevel: String(form.get("cefrLevel") || "") || undefined,
      britishTranscription: String(form.get("britishTranscription") || "") || undefined,
      americanTranscription: String(form.get("americanTranscription") || "") || undefined,
      britishAudioUrl: String(form.get("britishAudioUrl") || "") || undefined,
      americanAudioUrl: String(form.get("americanAudioUrl") || "") || undefined,
      isPhrasalVerb: form.get("isPhrasalVerb") === "on",
      isIdiomatic: form.get("isIdiomatic") === "on",
      isSlang: form.get("isSlang") === "on",
      meanings: [{ definition: String(form.get("definition") ?? ""), translation: String(form.get("translation") || "") || undefined, article: String(form.get("article") || "") || undefined, usageLabel: String(form.get("usageLabel") || "") || undefined }],
      examples: form.get("example") ? [{ sentence: String(form.get("example")), translation: String(form.get("exampleTranslation") || "") || undefined }] : [],
      collocations: form.get("collocation") ? [{ value: String(form.get("collocation")), translation: String(form.get("collocationTranslation") || "") || undefined }] : [],
    };
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { data?: { id: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Unable to create word");
      router.push(`/admin/vocabulary/${result.data.id}`);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create word"); } finally { setBusy(false); }
  }

  return <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-3"><label className="md:col-span-2">Lemma<input required name="lemma" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>Part of speech<select name="partOfSpeech" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Not set</option>{partsOfSpeech.map((part) => <option key={part}>{part}</option>)}</select></label><label>CEFR<select name="cefrLevel" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Not set</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label><label>British transcription<input name="britishTranscription" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>American transcription<input name="americanTranscription" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>British audio URL<input name="britishAudioUrl" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>American audio URL<input name="americanAudioUrl" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div><fieldset className="flex flex-wrap gap-5 text-sm"><label><input name="isPhrasalVerb" type="checkbox" /> Phrasal verb</label><label><input name="isIdiomatic" type="checkbox" /> Idiom</label><label><input name="isSlang" type="checkbox" /> Slang</label></fieldset><div className="grid gap-4 md:grid-cols-2"><label>Definition<textarea required name="definition" className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>Translation<input name="translation" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="mt-2 block">Article<input name="article" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></span><span className="mt-2 block">Usage label<input name="usageLabel" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></span></label></div><div className="grid gap-4 md:grid-cols-2"><label>Example<input name="example" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>Example translation<input name="exampleTranslation" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>Collocation<input name="collocation" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label>Collocation translation<input name="collocationTranslation" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div><button disabled={busy} className="w-fit rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? "Creating…" : "Create word"}</button>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</form>;
}
