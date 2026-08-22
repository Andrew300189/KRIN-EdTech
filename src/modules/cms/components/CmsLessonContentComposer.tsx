"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EXERCISE_ENGINES,
  getDefaultExerciseSubtype,
  getExerciseDefinitions,
  getExerciseEngine,
  normalizeExerciseEngineKey,
  type ExerciseEngineKey,
} from "@/modules/cms/exercise-engines/registry";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";

const legacyTypes = [
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT_INPUT", "FILL_IN_THE_BLANK", "MATCHING", "WORD_ORDER",
  "SENTENCE_ORDER", "ERROR_CORRECTION", "SENTENCE_TRANSLATION", "TENSE_SELECTION", "TENSE_TRANSFORMATION",
  "SYNONYM_SELECTION", "ANTONYM_SELECTION", "PHRASAL_VERB_MEANING", "VERB_PREPOSITION", "TRANSCRIPTION_MATCH",
  "LISTENING_QUESTIONS", "DICTATION", "TEXT_RECONSTRUCTION", "EXTRA_WORDS",
] as const;

const defaultType: Record<ExerciseEngineKey, (typeof legacyTypes)[number]> = {
  "single-choice": "SINGLE_CHOICE", "multiple-choice": "MULTIPLE_CHOICE", "true-false-not-given": "SINGLE_CHOICE",
  "text-input": "TEXT_INPUT", "fill-in-the-blanks": "FILL_IN_THE_BLANK", "dropdown-gaps": "SINGLE_CHOICE",
  "drag-and-drop": "WORD_ORDER", matching: "MATCHING", sorting: "WORD_ORDER", "sentence-builder": "SENTENCE_ORDER",
  categorization: "WORD_ORDER", "find-and-correct": "ERROR_CORRECTION", "highlight-text": "SINGLE_CHOICE",
  "reading-with-questions": "TEXT_INPUT", "audio-with-questions": "LISTENING_QUESTIONS", "video-with-questions": "LISTENING_QUESTIONS",
  "voice-recording": "TEXT_INPUT", "ai-speaking-dialogue": "TEXT_INPUT", "pronunciation-check": "TEXT_INPUT",
  "writing-assignment": "TEXT_INPUT", translation: "SENTENCE_TRANSLATION", flashcards: "TEXT_INPUT",
  "interactive-dialogue": "SENTENCE_ORDER", "timed-quiz": "MULTIPLE_CHOICE", "adaptive-test": "MULTIPLE_CHOICE",
  "teacher-reviewed-assignment": "TEXT_INPUT", "peer-review": "TEXT_INPUT", "project-assignment": "TEXT_INPUT",
  "game-scenario": "MULTIPLE_CHOICE", "personal-error-review": "TEXT_INPUT",
};

type Exercise = {
  id: string; type: string; engineKey: string; variantKey: string | null; instruction: string; question: string;
  content: unknown; correctAnswer: unknown; alternativeAnswers: unknown; explanation: string | null; hint: string | null;
  hintsEnabled: boolean; difficulty: number; basePoints: number; timeLimitSeconds: number | null; solutionCost: number;
  allowInstantCheck: boolean; allowExtraExercise: boolean;
};
export type CmsLessonContentBlock = { id: string; type: string; title: string | null; content: unknown; settings: unknown; isRequired: boolean; order: number; exercises: Exercise[] };
type Fields = {
  type: string; engineKey: ExerciseEngineKey; variantKey: string; instruction: string; question: string; source: string;
  mediaUrl: string; options: string; left: string; right: string; pairs: string; categories: string; items: string; answers: string;
  additional: string; explanation: string; hint: string; hintsEnabled: boolean; difficulty: number; points: number; timeLimit: string;
  solutionCost: number; instantCheck: boolean; extraExercise: boolean;
};

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100";
const textareaClass = `${inputClass} min-h-24 resize-y`;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}
function list(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
function lines(value: string): string[] { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function string(value: unknown): string { return typeof value === "string" ? value : ""; }
function json(value: unknown): string { return value == null ? "" : JSON.stringify(value, null, 2); }
function mappingFrom(value: string) {
  return Object.fromEntries(lines(value).flatMap((line) => {
    const [left, ...right] = line.split("="); const key = left?.trim(); const target = right.join("=").trim();
    return key && target ? [[key, target]] : [];
  }));
}
function mappingText(value: unknown) {
  return Object.entries(record(value)).flatMap(([left, right]) => typeof right === "string" ? [`${left} = ${right}`] : []).join("\n");
}
function otherContent(value: unknown) {
  const result = record(value);
  for (const key of ["options", "left", "right", "categories", "items", "text", "sourceText", "mediaUrl", "preserveOrder"]) delete result[key];
  return json(result);
}
function readFields(exercise?: Exercise): Fields {
  const engineKey = normalizeExerciseEngineKey(exercise?.engineKey) ?? "single-choice";
  const content = record(exercise?.content);
  const primaryAnswer = typeof exercise?.correctAnswer === "string" ? [exercise.correctAnswer] : list(exercise?.correctAnswer);
  return {
    type: exercise?.type ?? defaultType[engineKey], engineKey, variantKey: exercise?.variantKey ?? getDefaultExerciseSubtype(engineKey) ?? "",
    instruction: exercise?.instruction ?? "", question: exercise?.question ?? "", source: string(content.text) || string(content.sourceText),
    mediaUrl: string(content.mediaUrl), options: list(content.options).join("\n"), left: list(content.left).join("\n"), right: list(content.right).join("\n"),
    pairs: mappingText(exercise?.correctAnswer), categories: list(content.categories).join("\n"), items: list(content.items).join("\n"),
    answers: [...primaryAnswer, ...list(exercise?.alternativeAnswers)].join("\n"), additional: otherContent(exercise?.content), explanation: exercise?.explanation ?? "", hint: exercise?.hint ?? "",
    hintsEnabled: exercise?.hintsEnabled ?? true, difficulty: exercise?.difficulty ?? 1, points: exercise?.basePoints ?? 1,
    timeLimit: exercise?.timeLimitSeconds?.toString() ?? "", solutionCost: exercise?.solutionCost ?? 0,
    instantCheck: exercise?.allowInstantCheck ?? true, extraExercise: exercise?.allowExtraExercise ?? false,
  };
}
function parseAdditional(value: string) {
  if (!value.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Additional content must be a JSON object.");
  return parsed as Record<string, unknown>;
}
function payloadFrom(fields: Fields, allowEmptyTimeLimit = false) {
  const engine = getExerciseEngine(fields.engineKey);
  if (!engine) throw new Error("Choose a supported exercise engine.");
  if (!fields.instruction.trim() || !fields.question.trim()) throw new Error("Add an instruction and a question.");
  const content = parseAdditional(fields.additional);
  const answers = lines(fields.answers);
  let correctAnswer: unknown = answers[0] ?? "";
  let alternativeAnswers: string[] | undefined = answers.slice(1);
  if (fields.source.trim()) content.text = fields.source.trim();
  if (fields.mediaUrl.trim()) content.mediaUrl = fields.mediaUrl.trim();
  if (fields.engineKey === "find-and-correct") {
    content.answerMode = "CORRECTED_TOKEN";
    content.ignorePunctuation = true;
  }

  if (["choice", "audio-choice", "hotspot"].includes(engine.renderer)) {
    const options = lines(fields.options);
    if (options.length < 2 || !answers.length) throw new Error("Add at least two options and a correct answer.");
    content.options = options;
    correctAnswer = fields.engineKey === "multiple-choice" ? answers : answers[0];
    alternativeAnswers = undefined;
  } else if (engine.renderer === "matching") {
    const left = lines(fields.left); const right = lines(fields.right); const pairs = mappingFrom(fields.pairs);
    if (!left.length || !right.length || !Object.keys(pairs).length) throw new Error("Add both matching lists and at least one correct pair.");
    content.left = left; content.right = right; correctAnswer = pairs; alternativeAnswers = undefined;
  } else if (engine.renderer === "classification") {
    const categories = lines(fields.categories); const items = lines(fields.items); const pairs = mappingFrom(fields.pairs);
    if (!categories.length || !items.length || !Object.keys(pairs).length) throw new Error("Add categories, items and a correct category for each item.");
    content.categories = categories; content.items = items; correctAnswer = pairs; alternativeAnswers = undefined;
  } else if (["ordering", "word-bank"].includes(engine.renderer)) {
    const options = lines(fields.options); const order = lines(fields.answers);
    if (options.length < 2 || order.length < 2) throw new Error("Add available tokens and the correct order.");
    content.options = options; content.preserveOrder = true; correctAnswer = order; alternativeAnswers = undefined;
  } else if (!answers.length) throw new Error("Add an accepted answer or reference response.");

  const timeLimitSeconds = fields.timeLimit.trim() ? Number(fields.timeLimit) : allowEmptyTimeLimit ? null : undefined;
  return {
    type: fields.type, engineKey: fields.engineKey, variantKey: fields.variantKey, instruction: fields.instruction.trim(), question: fields.question.trim(), content, correctAnswer,
    ...(alternativeAnswers?.length ? { alternativeAnswers } : {}), ...(fields.explanation.trim() ? { explanation: fields.explanation.trim() } : {}), ...(fields.hint.trim() ? { hint: fields.hint.trim() } : {}),
    hintsEnabled: fields.hintsEnabled, difficulty: Math.max(1, Math.min(10, fields.difficulty || 1)), basePoints: Math.max(0, fields.points || 0),
    ...(timeLimitSeconds !== undefined ? { timeLimitSeconds } : {}), solutionCost: Math.max(0, fields.solutionCost || 0), allowInstantCheck: fields.instantCheck, allowExtraExercise: fields.extraExercise,
  };
}
async function request(url: string, method: "POST" | "PATCH", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error ?? "Unable to save this lesson item.");
}

function Notice({ message, error = false }: { message: string | null; error?: boolean }) {
  return message ? <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null;
}

function AuthorPreview({ fields }: { fields: Fields }) {
  const [answer, setAnswer] = useState(""); const [selected, setSelected] = useState<string[]>([]); const [mapped, setMapped] = useState<Record<string, string>>({}); const [ordered, setOrdered] = useState<string[]>([]); const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const engine = getExerciseEngine(fields.engineKey); const renderer = engine?.renderer; const options = lines(fields.options); const multiple = fields.engineKey === "multiple-choice";
  function check() { try { const payload = payloadFrom(fields); let submitted: unknown = answer; if (["choice", "audio-choice", "hotspot"].includes(renderer ?? "")) submitted = multiple ? selected : selected[0] ?? ""; if (["matching", "classification"].includes(renderer ?? "")) submitted = mapped; if (["ordering", "word-bank"].includes(renderer ?? "")) submitted = ordered; setResult(answerMatches(submitted, payload.correctAnswer, payload.alternativeAnswers ?? [], payload.content) ? "correct" : "incorrect"); } catch { setResult("incorrect"); } }
  const interactive = ["choice", "audio-choice", "hotspot", "matching", "classification", "ordering", "word-bank"].includes(renderer ?? "");
  return <aside className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Test before saving</p><p className="mt-2 font-semibold text-slate-950">{fields.instruction || "Add an instruction."}</p>{fields.source ? <p className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{fields.source}</p> : null}<p className="mt-3 text-sm text-slate-700">{fields.question || "Add a question."}</p><div className="mt-4 space-y-2">{["choice", "audio-choice", "hotspot"].includes(renderer ?? "") && options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><input type={multiple ? "checkbox" : "radio"} name={`preview-${fields.engineKey}`} checked={selected.includes(option)} onChange={() => { setResult(null); setSelected((current) => multiple ? (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]) : [option]); }} />{option}</label>)}{renderer === "matching" && lines(fields.left).map((left) => <label key={left} className="grid gap-2 text-sm sm:grid-cols-2 sm:items-center"><span>{left}</span><select value={mapped[left] ?? ""} onChange={(event) => setMapped((current) => ({ ...current, [left]: event.target.value }))} className={inputClass}><option value="">Choose</option>{lines(fields.right).map((right) => <option key={right}>{right}</option>)}</select></label>)}{renderer === "classification" && lines(fields.items).map((item) => <label key={item} className="grid gap-2 text-sm sm:grid-cols-2 sm:items-center"><span>{item}</span><select value={mapped[item] ?? ""} onChange={(event) => setMapped((current) => ({ ...current, [item]: event.target.value }))} className={inputClass}><option value="">Choose</option>{lines(fields.categories).map((category) => <option key={category}>{category}</option>)}</select></label>)}{["ordering", "word-bank"].includes(renderer ?? "") && <><div className="flex flex-wrap gap-2">{options.map((token, index) => <button key={`${token}-${index}`} type="button" onClick={() => setOrdered((current) => [...current, token])} className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-sm font-semibold text-violet-900">{token}</button>)}</div><div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-dashed border-violet-200 bg-white p-2">{ordered.map((token, index) => <button key={`${token}-${index}`} type="button" onClick={() => setOrdered((current) => current.filter((_, position) => position !== index))} className="rounded-lg bg-violet-100 px-2 py-1 text-sm">{token}</button>)}</div></>}{!interactive ? <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className={`${inputClass} min-h-20`} placeholder="Write a learner answer" /> : null}</div><div className="mt-4 flex gap-2"><button type="button" onClick={check} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800">Check result</button><button type="button" onClick={() => { setAnswer(""); setSelected([]); setMapped({}); setOrdered([]); setResult(null); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">Reset</button></div>{result ? <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${result === "correct" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{result === "correct" ? "Correct — this answer is accepted." : "Not correct yet. Check the configuration."}</p> : null}</aside>;
}

function ExerciseForm({ blockId, exercise, saved }: { blockId: string; exercise?: Exercise; saved: () => void }) {
  const initial = useMemo(() => readFields(exercise), [exercise]); const [fields, setFields] = useState(initial); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState(false); const [isPending, startTransition] = useTransition();
  const engine = getExerciseEngine(fields.engineKey); const definitions = getExerciseDefinitions(fields.engineKey); const renderer = engine?.renderer ?? ""; const mediaSupported = definitions.some((item) => item.supportsAudio || item.supportsVideo || item.supportsImages); const sourceSupported = ["passage", "media", "recording", "audio-choice", "steps"].includes(renderer);
  const set = <Key extends keyof Fields>(key: Key, value: Fields[Key]) => setFields((current) => ({ ...current, [key]: value }));
  function chooseEngine(key: ExerciseEngineKey) { setFields((current) => ({ ...current, engineKey: key, type: defaultType[key], variantKey: getDefaultExerciseSubtype(key) ?? "" })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); startTransition(async () => { try { await request(exercise ? `/api/admin/exercises/${exercise.id}` : `/api/admin/blocks/${blockId}/exercises`, exercise ? "PATCH" : "POST", payloadFrom(fields, Boolean(exercise))); setError(false); setMessage(exercise ? "Exercise saved as an audited revision." : "Draft exercise added to this lesson."); saved(); } catch (caught) { setError(true); setMessage(caught instanceof Error ? caught.message : "Unable to save the exercise."); } }); }
  const choice = ["choice", "audio-choice", "hotspot"].includes(renderer); const ordering = ["ordering", "word-bank"].includes(renderer);
  return <form onSubmit={submit} className="mt-4 grid gap-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 lg:grid-cols-2"><div className="lg:col-span-2"><h3 className="text-lg font-bold text-slate-950">{exercise ? "Edit exercise" : "Add exercise"}</h3><p className="mt-1 text-sm text-slate-600">All thirty engines use the same clear authoring flow; only relevant language fields appear.</p></div><label className="text-sm font-semibold text-slate-700">Universal engine<select value={fields.engineKey} onChange={(event) => chooseEngine(event.target.value as ExerciseEngineKey)} className={inputClass}>{EXERCISE_ENGINES.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Methodological subtype<select value={fields.variantKey} onChange={(event) => set("variantKey", event.target.value)} className={inputClass}>{definitions.map((item) => <option key={item.subtype} value={item.subtype}>{item.title}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Learner activity type<select value={fields.type} onChange={(event) => set("type", event.target.value)} className={inputClass}>{legacyTypes.map((item) => <option key={item}>{item}</option>)}</select></label><div className="rounded-xl border border-violet-100 bg-white p-3 text-sm text-slate-600"><p className="font-bold text-slate-800">{engine?.engine}</p><p className="mt-1">{engine?.description}</p></div><label className="lg:col-span-2 text-sm font-semibold text-slate-700">Instruction<textarea required value={fields.instruction} onChange={(event) => set("instruction", event.target.value)} className={textareaClass} placeholder="What should the learner do?" /></label><label className="lg:col-span-2 text-sm font-semibold text-slate-700">Question or prompt<textarea required value={fields.question} onChange={(event) => set("question", event.target.value)} className={textareaClass} /></label>{sourceSupported ? <label className="lg:col-span-2 text-sm font-semibold text-slate-700">Source text or transcript<textarea value={fields.source} onChange={(event) => set("source", event.target.value)} className={textareaClass} placeholder="Passage, dialogue, scenario or media transcript" /></label> : null}{mediaSupported ? <label className="lg:col-span-2 text-sm font-semibold text-slate-700">Media URL <span className="font-normal text-slate-500">(optional)</span><input type="url" value={fields.mediaUrl} onChange={(event) => set("mediaUrl", event.target.value)} className={inputClass} placeholder="https://…" /></label> : null}{choice ? <><label className="text-sm font-semibold text-slate-700">Options — one per line<textarea value={fields.options} onChange={(event) => set("options", event.target.value)} className={textareaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct answer{fields.engineKey === "multiple-choice" ? "s" : ""} — one per line<textarea value={fields.answers} onChange={(event) => set("answers", event.target.value)} className={textareaClass} /></label></> : null}{renderer === "matching" ? <><label className="text-sm font-semibold text-slate-700">Left items — one per line<textarea value={fields.left} onChange={(event) => set("left", event.target.value)} className={textareaClass} /></label><label className="text-sm font-semibold text-slate-700">Right items — one per line<textarea value={fields.right} onChange={(event) => set("right", event.target.value)} className={textareaClass} /></label><label className="lg:col-span-2 text-sm font-semibold text-slate-700">Correct pairs — one per line, left = right<textarea value={fields.pairs} onChange={(event) => set("pairs", event.target.value)} className={textareaClass} /></label></> : null}{renderer === "classification" ? <><label className="text-sm font-semibold text-slate-700">Categories — one per line<textarea value={fields.categories} onChange={(event) => set("categories", event.target.value)} className={textareaClass} /></label><label className="text-sm font-semibold text-slate-700">Items — one per line<textarea value={fields.items} onChange={(event) => set("items", event.target.value)} className={textareaClass} /></label><label className="lg:col-span-2 text-sm font-semibold text-slate-700">Correct categories — one per line, item = category<textarea value={fields.pairs} onChange={(event) => set("pairs", event.target.value)} className={textareaClass} /></label></> : null}{ordering ? <><label className="text-sm font-semibold text-slate-700">Available tokens — one per line<textarea value={fields.options} onChange={(event) => set("options", event.target.value)} className={textareaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct order — one token per line<textarea value={fields.answers} onChange={(event) => set("answers", event.target.value)} className={textareaClass} /></label></> : null}{!choice && renderer !== "matching" && renderer !== "classification" && !ordering ? <label className="lg:col-span-2 text-sm font-semibold text-slate-700">Accepted answer or reference response — alternatives one per line<textarea value={fields.answers} onChange={(event) => set("answers", event.target.value)} className={textareaClass} /></label> : null}<label className="text-sm font-semibold text-slate-700">Explanation<textarea value={fields.explanation} onChange={(event) => set("explanation", event.target.value)} className={textareaClass} /></label><label className="text-sm font-semibold text-slate-700">Hint<textarea value={fields.hint} onChange={(event) => set("hint", event.target.value)} className={textareaClass} /></label><div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4"><label className="text-sm font-semibold text-slate-700">Difficulty<input type="number" min="1" max="10" value={fields.difficulty} onChange={(event) => set("difficulty", Number(event.target.value))} className={inputClass} /></label><label className="text-sm font-semibold text-slate-700">Points<input type="number" min="0" max="1000" value={fields.points} onChange={(event) => set("points", Number(event.target.value))} className={inputClass} /></label><label className="text-sm font-semibold text-slate-700">Time limit (seconds)<input type="number" min="1" max="86400" value={fields.timeLimit} onChange={(event) => set("timeLimit", event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-slate-700">Solution cost<input type="number" min="0" max="10000" value={fields.solutionCost} onChange={(event) => set("solutionCost", Number(event.target.value))} className={inputClass} /></label></div><div className="lg:col-span-2 flex flex-wrap gap-5 text-sm font-semibold text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked={fields.hintsEnabled} onChange={(event) => set("hintsEnabled", event.target.checked)} />Hints enabled</label><label className="flex items-center gap-2"><input type="checkbox" checked={fields.instantCheck} onChange={(event) => set("instantCheck", event.target.checked)} />Instant check</label><label className="flex items-center gap-2"><input type="checkbox" checked={fields.extraExercise} onChange={(event) => set("extraExercise", event.target.checked)} />Allow extra exercise</label></div><details className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced content fields</summary><p className="mt-2 text-sm text-slate-500">Optional examples and error details. Normal authoring never requires JSON.</p><textarea value={fields.additional} onChange={(event) => set("additional", event.target.value)} className={`${textareaClass} font-mono text-xs`} placeholder='{"example":"…"}' /></details><div className="lg:col-span-2"><AuthorPreview fields={fields} /></div><div className="lg:col-span-2 flex flex-wrap items-center gap-3"><button disabled={isPending} className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">{isPending ? "Saving…" : exercise ? "Save exercise" : "Add exercise"}</button>{exercise ? <Link href={`/cms/exercises/${exercise.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Advanced editor</Link> : null}</div><div className="lg:col-span-2"><Notice message={message} error={error} /></div></form>;
}

function TextBlock({ block, saved }: { block: CmsLessonContentBlock; saved: () => void }) {
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(block.title ?? ""); const [text, setText] = useState(() => { const content = record(block.content); return block.type === "VIDEO" || block.type === "IMAGE" ? string(content.url) : string(content.text) || string(content.sourceText); }); const [required, setRequired] = useState(block.isRequired); const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition(); const media = block.type === "VIDEO" || block.type === "IMAGE";
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); startTransition(async () => { try { const content = record(block.content); if (media) content.url = text.trim(); else content.text = text.trim(); await request(`/api/admin/blocks/${block.id}`, "PATCH", { title: title.trim() || undefined, content, isRequired: required }); setOpen(false); setMessage("Block saved."); saved(); } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to save the block."); } }); }
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{block.type} · Block {block.order}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{block.title || "Untitled block"}</h3><p className="mt-1 text-sm text-slate-500">{block.isRequired ? "Required" : "Optional"}</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{open ? "Close" : "Edit block"}</button></div>{open ? <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4"><label className="text-sm font-semibold text-slate-700">Block title<input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-slate-700">{media ? "Media URL" : "Learner-facing content"}<textarea value={text} onChange={(event) => setText(event.target.value)} className={`${textareaClass} min-h-32`} /></label><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required before completion</label><button disabled={isPending} className="w-fit rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isPending ? "Saving…" : "Save block"}</button></form> : <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text || "No content yet."}</p>}<Notice message={message} /></article>;
}

export function CmsLessonContentComposer({ lessonId, blocks, onContentChanged }: { lessonId: string; blocks: CmsLessonContentBlock[]; onContentChanged?: () => void }) {
  const router = useRouter(); const [showCreate, setShowCreate] = useState(false); const exerciseBlocks = blocks.filter((block) => block.type === "EXERCISE"); const [targetBlockId, setTargetBlockId] = useState(() => exerciseBlocks[0]?.id ?? ""); const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition();
  function refresh() { onContentChanged?.(); router.refresh(); }
  function createPracticeBlock() { startTransition(async () => { try { await request(`/api/admin/lessons/${lessonId}/blocks`, "POST", { type: "EXERCISE", title: "Practice", isRequired: true }); setMessage("Practice block created. Open Add exercise again to configure it."); refresh(); } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to create the practice block."); } }); }
  return <section id="lesson-content" className="mt-6 space-y-6"><div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Lesson composer</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Build and test the learner experience</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This is an isolated draft. Change the template wording, configure any engine and test a response before you publish.</p></div><div className="flex flex-wrap gap-2"><Link href={`/cms/preview/lessons/${lessonId}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Preview lesson</Link><button type="button" onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800">{showCreate ? "Close form" : "Add exercise"}</button></div></div><Notice message={message} error={message?.includes("Unable")} /></div>{showCreate ? <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Practice</p><h2 className="mt-1 text-xl font-bold text-slate-950">Add a new exercise</h2></div>{exerciseBlocks.length ? <label className="text-sm font-semibold text-slate-700">Add to<select value={targetBlockId} onChange={(event) => setTargetBlockId(event.target.value)} className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Choose exercise block</option>{exerciseBlocks.map((block) => <option key={block.id} value={block.id}>{block.title || `Exercise block ${block.order}`}</option>)}</select></label> : null}</div>{targetBlockId ? <ExerciseForm key={targetBlockId} blockId={targetBlockId} saved={() => { setShowCreate(false); refresh(); }} /> : <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-700">Create a practice block first, then add any of the thirty exercise engines.</p><button type="button" disabled={isPending} onClick={createPracticeBlock} className="mt-3 rounded-xl border border-violet-700 px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60">{isPending ? "Creating…" : "Create practice block"}</button></div>}</section> : null}<section aria-label="Lesson content" className="space-y-4">{blocks.map((block) => block.type === "EXERCISE" ? <article key={block.id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Exercise block · {block.order}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{block.title || "Practice"}</h3><p className="mt-1 text-sm text-slate-500">{block.exercises.length} activities</p></div><button type="button" onClick={() => { setTargetBlockId(block.id); setShowCreate(true); }} className="rounded-xl border border-violet-700 px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50">Add here</button></div><div className="mt-4 space-y-4">{block.exercises.map((exercise) => <details key={exercise.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3 pr-7"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{exercise.engineKey} · {exercise.variantKey ?? "No subtype"}</p><h4 className="mt-1 font-bold text-slate-950">{exercise.question}</h4></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{exercise.basePoints} points</span></div></summary><ExerciseForm blockId={block.id} exercise={exercise} saved={refresh} /></details>)}{!block.exercises.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No exercise yet. Use Add here to create one.</p> : null}</div></article> : <TextBlock key={block.id} block={block} saved={refresh} />)}{!blocks.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">This lesson has no content blocks yet. Use the existing lesson additions above, then configure exercises here.</p> : null}</section></section>;
}
