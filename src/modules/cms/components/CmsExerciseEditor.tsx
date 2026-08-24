"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EXERCISE_ENGINES,
  getDefaultExerciseSubtype,
  getExerciseDefinition,
  getExerciseDefinitions,
  normalizeExerciseEngineKey,
  type ExerciseEngineKey,
} from "@/modules/cms/exercise-engines/registry";
import { answerMatches, contentWithOrderSensitiveAnswerValidation } from "@/modules/courses/utils/exercise-evaluation";

const exerciseTypes = [
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT_INPUT", "FILL_IN_THE_BLANK", "MATCHING", "WORD_ORDER",
  "SENTENCE_ORDER", "ERROR_CORRECTION", "SENTENCE_TRANSLATION", "TENSE_SELECTION", "TENSE_TRANSFORMATION",
  "SYNONYM_SELECTION", "ANTONYM_SELECTION", "PHRASAL_VERB_MEANING", "VERB_PREPOSITION", "TRANSCRIPTION_MATCH",
  "LISTENING_QUESTIONS", "DICTATION", "TEXT_RECONSTRUCTION", "EXTRA_WORDS",
] as const;

type Exercise = {
  id: string;
  type: string;
  engineKey: string;
  variantKey: string | null;
  instruction: string;
  question: string;
  content: unknown;
  correctAnswer: unknown;
  alternativeAnswers: unknown;
  explanation: string | null;
  hint: string | null;
  hintsEnabled: boolean;
  difficulty: number;
  basePoints: number;
  timeLimitSeconds: number | null;
  solutionCost: number;
  allowInstantCheck: boolean;
  allowExtraExercise: boolean;
};

function prettyJson(value: unknown) {
  return value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
}

function parseJson(value: FormDataEntryValue | null, label: string, required = false) {
  const text = String(value ?? "").trim();
  if (!text) {
    if (required) throw new Error(`${label} must be valid JSON.`);
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function DefinitionSummary({ engineKey, subtype }: { engineKey: string; subtype: string }) {
  const definition = getExerciseDefinition(engineKey, subtype);
  if (!definition) return null;
  const capabilities = [
    definition.supportsAudio && "audio",
    definition.supportsVideo && "video",
    definition.supportsImages && "images",
    definition.supportsAiEvaluation && "AI evaluation",
    definition.supportsTeacherReview && "teacher review",
  ].filter(Boolean);

  return (
    <aside className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-950">{definition.title}</p>
      <p className="mt-1">Category: {definition.category} · Answers: {definition.supportedAnswerModes.join(", ")}</p>
      <p className="mt-1">{capabilities.length ? `Supports ${capabilities.join(", ")}.` : "No special media or review capability."}</p>
      {Object.keys(definition.defaultSettings).length ? (
        <p className="mt-1 font-mono text-xs">Defaults: {JSON.stringify(definition.defaultSettings)}</p>
      ) : null}
    </aside>
  );
}

export function CmsExerciseDetailsEditor({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const initialEngineKey = normalizeExerciseEngineKey(exercise.engineKey) ?? EXERCISE_ENGINES[0].key;
  const [engineKey, setEngineKey] = useState(initialEngineKey);
  const [subtype, setSubtype] = useState(exercise.variantKey ?? getDefaultExerciseSubtype(initialEngineKey) ?? "");
  const availableSubtypes = useMemo(() => getExerciseDefinitions(engineKey), [engineKey]);

  function selectEngine(nextEngineKey: ExerciseEngineKey) {
    setEngineKey(nextEngineKey);
    setSubtype(getDefaultExerciseSubtype(nextEngineKey) ?? "");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/exercises/${exercise.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: form.get("type"),
            engineKey,
            variantKey: subtype,
            instruction: form.get("instruction"),
            question: form.get("question"),
            content: parseJson(form.get("content"), "Content"),
            correctAnswer: parseJson(form.get("correctAnswer"), "Correct answer", true),
            alternativeAnswers: parseJson(form.get("alternativeAnswers"), "Alternative answers"),
            explanation: form.get("explanation") || undefined,
            hint: form.get("hint") || undefined,
            hintsEnabled: form.get("hintsEnabled") === "on",
            difficulty: Number(form.get("difficulty") || 1),
            basePoints: Number(form.get("basePoints") || 0),
            timeLimitSeconds: form.get("timeLimitSeconds") ? Number(form.get("timeLimitSeconds")) : null,
            solutionCost: Number(form.get("solutionCost") || 0),
            allowInstantCheck: form.get("allowInstantCheck") === "on",
            allowExtraExercise: form.get("allowExtraExercise") === "on",
          }),
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to save exercise.");
        setMessage("Exercise saved and a new revision was recorded.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save exercise.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-bold text-slate-950">Exercise configuration</h2>
        <p className="mt-1 text-sm text-slate-600">The registry controls valid engines, methodological subtypes and supported capabilities.</p>
      </div>
      <label className="text-sm font-medium text-slate-700">
        Legacy learner activity type
        <select name="type" defaultValue={exercise.type} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          {exerciseTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Universal engine
        <select value={engineKey} onChange={(event) => selectEngine(event.target.value as ExerciseEngineKey)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          {EXERCISE_ENGINES.map((engine) => <option key={engine.key} value={engine.key}>{engine.engine} — {engine.title}</option>)}
        </select>
      </label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">
        Methodological subtype
        <select value={subtype} onChange={(event) => setSubtype(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          {availableSubtypes.map((definition) => <option key={definition.subtype} value={definition.subtype}>{definition.subtype} — {definition.title}</option>)}
        </select>
      </label>
      <DefinitionSummary engineKey={engineKey} subtype={subtype} />
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Instruction<textarea name="instruction" required defaultValue={exercise.instruction} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Question<textarea name="question" required defaultValue={exercise.question} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Content JSON<textarea name="content" defaultValue={prettyJson(exercise.content)} placeholder='{"options":["a","b"]}' className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
      <label className="text-sm font-medium text-slate-700">Correct answer JSON<textarea name="correctAnswer" required defaultValue={prettyJson(exercise.correctAnswer)} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
      <label className="text-sm font-medium text-slate-700">Alternative answers JSON<textarea name="alternativeAnswers" defaultValue={prettyJson(exercise.alternativeAnswers)} placeholder='["accepted answer"]' className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
      <label className="text-sm font-medium text-slate-700">Explanation<textarea name="explanation" defaultValue={exercise.explanation ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Hint<textarea name="hint" defaultValue={exercise.hint ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Difficulty<input name="difficulty" type="number" min="1" max="10" defaultValue={exercise.difficulty} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Points<input name="basePoints" type="number" min="0" max="1000" defaultValue={exercise.basePoints} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Time limit (seconds)<input name="timeLimitSeconds" type="number" min="1" max="86400" defaultValue={exercise.timeLimitSeconds ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Solution cost<input name="solutionCost" type="number" min="0" max="10000" defaultValue={exercise.solutionCost} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <div className="md:col-span-2 flex flex-wrap gap-5 text-sm font-medium text-slate-700">
        <label className="flex items-center gap-2"><input name="hintsEnabled" type="checkbox" defaultChecked={exercise.hintsEnabled} />Hints enabled</label>
        <label className="flex items-center gap-2"><input name="allowInstantCheck" type="checkbox" defaultChecked={exercise.allowInstantCheck} />Instant check</label>
        <label className="flex items-center gap-2"><input name="allowExtraExercise" type="checkbox" defaultChecked={exercise.allowExtraExercise} />Allow extra exercise</label>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <button disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Save exercise"}</button>
        {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
      </div>
    </form>
  );
}

export function CmsExerciseStudentPreview({ exercise }: { exercise: Pick<Exercise, "instruction" | "question" | "content" | "correctAnswer" | "alternativeAnswers" | "hint" | "hintsEnabled" | "engineKey"> }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const options = useMemo(() => {
    const value = exercise.content;
    return value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { options?: unknown }).options)
      ? (value as { options: unknown[] }).options.filter((item): item is string => typeof item === "string")
      : [];
  }, [exercise.content]);

  function test() {
    let submitted: unknown = answer;
    try {
      submitted = JSON.parse(answer);
    } catch {
      // Plain text remains a valid answer mode.
    }
    setResult(answerMatches(
      submitted,
      exercise.correctAnswer,
      exercise.alternativeAnswers,
      contentWithOrderSensitiveAnswerValidation(exercise.content, exercise.engineKey),
    ) ? "Correct answer" : "Incorrect answer");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student preview</p>
      <p className="mt-3 font-medium text-slate-900">{exercise.instruction}</p>
      <p className="mt-2 text-slate-700">{exercise.question}</p>
      {options.length ? <div className="mt-4 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => setAnswer(option)} className={`rounded-lg border px-3 py-2 text-sm ${answer === option ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"}`}>{option}</button>)}</div> : null}
      <label className="mt-4 block text-sm font-medium text-slate-700">Test answer<input value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Plain text or JSON" /></label>
      <button type="button" onClick={test} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Check answer</button>
      {exercise.hintsEnabled && exercise.hint ? <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Show hint</summary><p className="mt-2">{exercise.hint}</p></details> : null}
      {result ? <p role="status" className={`mt-4 rounded-lg p-3 text-sm font-semibold ${result === "Correct answer" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>{result}</p> : null}
    </section>
  );
}

export function CmsExerciseTemplateSave({ exerciseId, defaultTitle }: { exerciseId: string; defaultTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cms/exercises/${exerciseId}/template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.get("title"), description: form.get("description") || undefined }),
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to save template.");
        setMessage("Reusable exercise template saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save template.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="text-xl font-bold text-slate-950">Save as template</h2><p className="mt-1 text-sm text-slate-600">The template stores this validated configuration and always creates a new draft exercise.</p></div>
      <label className="text-sm font-medium text-slate-700">Template title<input name="title" required minLength={2} defaultValue={defaultTitle} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Description<input name="description" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <div className="md:col-span-2 flex items-center gap-3"><button disabled={isPending} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{isPending ? "Saving…" : "Save template"}</button>{message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}</div>
    </form>
  );
}
