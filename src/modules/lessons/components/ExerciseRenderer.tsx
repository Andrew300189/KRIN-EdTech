"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { asObject, asStringArray, displayAnswer, type JsonObject, type LessonExercise } from "./lesson-content";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { getExerciseEngine } from "@/modules/cms/exercise-engines/registry";

type Feedback = { example: string | null; theoryHref: string | null; errorDetails: Array<{ incorrect: string; correction: string; explanation: string | null }> };
type AttemptResult = {
  isCorrect: boolean; scoreAwarded: number; score: number; attemptNumber: number;
  explanation: string | null; correctAnswer: unknown; hint: string | null;
  feedback?: Feedback | null;
  solution?: { available: boolean; cost: number; opened: boolean } | null;
  motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean };
};
type SolutionResult = { alreadyOpened: boolean; cost: number; balance: number; correctAnswer: unknown; explanation: string | null; feedback: Feedback };

function mediaUrl(value: unknown) {
  return typeof value === "string" && /^(https?:)?\/\//.test(value) ? value : null;
}

function isMultipleChoice(exercise: LessonExercise) {
  return exercise.engineKey === "multiple-choice" || exercise.engineKey === "multi-choice" || exercise.type === "MULTIPLE_CHOICE";
}

export function ExerciseRenderer({ exercise }: { exercise: LessonExercise }) {
  const content = useMemo(() => asObject(exercise.content), [exercise.content]);
  const options = useMemo(() => asStringArray(content.options), [content]);
  const matchingLeft = useMemo(() => asStringArray(content.left), [content]);
  const matchingRight = useMemo(() => asStringArray(content.right), [content]);
  const categories = useMemo(() => asStringArray(content.categories), [content]);
  const classificationItems = useMemo(() => asStringArray(content.items).length ? asStringArray(content.items) : options, [content, options]);
  const engine = getExerciseEngine(exercise.engineKey);
  const renderer = engine?.renderer ?? "text";
  const multiple = isMultipleChoice(exercise);
  const choice = renderer === "choice" || renderer === "audio-choice" || renderer === "hotspot";
  const matching = renderer === "matching";
  const ordered = renderer === "ordering" || renderer === "word-bank";
  const classification = renderer === "classification";
  const longText = renderer === "long-text" || renderer === "recording" || renderer === "media";
  const [answer, setAnswer] = useState<string | string[] | JsonObject>(multiple || ordered ? [] : matching || classification ? {} : "");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [solution, setSolution] = useState<SolutionResult | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [extraExercise, setExtraExercise] = useState<LessonExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [solutionSending, setSolutionSending] = useState(false);
  const [extraSending, setExtraSending] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);

  function changeAnswer(next: string | string[] | JsonObject) {
    setAnswer(next); setResult(null); setSolution(null); setConfirmSolution(false); setIdempotencyKey(null);
  }

  async function checkAnswer() {
    setSending(true); setError(null);
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, idempotencyKey: key, hintUsed, timeSpentSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)) }) });
      const payload = await response.json() as { data?: AttemptResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to check the answer. Please sign in and try again."); return; }
      setResult(payload.data);
      if (payload.data.motivationReward?.awarded) {
        const reward = payload.data.motivationReward;
        setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "XP earned", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
      }
    } catch { setError("Unable to check the answer. Please try again."); }
    finally { setSending(false); }
  }

  async function openSolution() {
    setSolutionSending(true); setError(null);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/solution`, { method: "POST" });
      const payload = await response.json() as { data?: SolutionResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to open the solution."); return; }
      setSolution(payload.data); setConfirmSolution(false);
    } catch { setError("Unable to open the solution. Please try again."); }
    finally { setSolutionSending(false); }
  }

  async function loadExtraPractice() {
    setExtraSending(true); setError(null);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/extra`, { method: "POST" });
      const payload = await response.json() as { data?: LessonExercise | null; error?: string };
      if (!response.ok) { setError(payload.error ?? "Unable to prepare extra practice."); return; }
      if (!payload.data) { setError("You have completed the available extra practice for this lesson."); return; }
      setExtraExercise(payload.data);
    } catch { setError("Unable to prepare extra practice. Please try again."); }
    finally { setExtraSending(false); }
  }

  const audio = mediaUrl(content.audioUrl) ?? mediaUrl(content.mediaUrl);
  const video = mediaUrl(content.videoUrl);
  const passage = typeof content.passage === "string" ? content.passage : null;
  const visibleFeedback = solution ? { explanation: solution.explanation, correctAnswer: solution.correctAnswer, feedback: solution.feedback } : result && result.isCorrect !== undefined ? result : null;

  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-5" aria-label={exercise.instruction}>
    <RewardNotification events={rewardEvents} />
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{exercise.instruction}</p>{exercise.timeLimitSeconds ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">Recommended time: {Math.ceil(exercise.timeLimitSeconds / 60)} min</span> : null}</div>
    {passage ? <article className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800" aria-label="Reading passage">{passage}</article> : null}
    {audio ? <audio className="mt-3 w-full" controls preload="metadata" src={audio}>Your browser does not support audio playback.</audio> : null}
    {video ? <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={video}>Your browser does not support video playback.</video> : null}
    <p className="mt-3 text-slate-700">{exercise.question}</p>
    <div className="mt-4 space-y-2">
      {choice && options.map((option) => { const selected = multiple ? (answer as string[]).includes(option) : answer === option; return <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus-within:ring-2 focus-within:ring-blue-500"><input type={multiple ? "checkbox" : "radio"} name={exercise.id} checked={selected} onChange={() => changeAnswer(multiple ? (selected ? (answer as string[]).filter((item) => item !== option) : [...answer as string[], option]) : option)} /><span>{option}</span></label>; })}
      {matching && matchingLeft.map((leftItem) => <label key={leftItem} className="grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{leftItem}</span><select className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={String((answer as JsonObject)[leftItem] ?? "")} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [leftItem]: event.target.value })}><option value="">Choose a match</option>{matchingRight.map((rightItem) => <option key={rightItem} value={rightItem}>{rightItem}</option>)}</select></label>)}
      {ordered ? <><div className="flex flex-wrap gap-2" aria-label="Available tokens">{options.map((option, index) => <button key={`${option}-${index}`} type="button" onClick={() => changeAnswer([...(answer as string[]), option])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">{option}</button>)}</div><ol className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-700" aria-label="Selected order">{(answer as string[]).map((token, index) => <li key={`${token}-${index}`}><button type="button" onClick={() => changeAnswer((answer as string[]).filter((_, tokenIndex) => tokenIndex !== index))} className="rounded bg-blue-50 px-2 py-1 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={`Remove ${token}`}>{index + 1}. {token}</button></li>)}</ol><button type="button" onClick={() => changeAnswer([])} className="text-sm font-semibold text-blue-700 hover:underline">Reset order</button></> : null}
      {classification && classificationItems.map((item) => <label key={item} className="grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={String((answer as JsonObject)[item] ?? "")} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [item]: event.target.value })}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>)}
      {!choice && !matching && !ordered && !classification ? <label className="block"><span className="sr-only">Your answer</span>{longText ? <textarea value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} rows={5} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder={renderer === "recording" ? "Write a transcript or response for review" : "Write your answer"} /> : <input value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Type your answer" />}</label> : null}
    </div>
    <button type="button" onClick={checkAnswer} disabled={sending} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{sending ? "Checking…" : "Check answer"}</button>
    {exercise.hintsEnabled && exercise.hint ? <details className="mt-3 text-sm text-slate-600" onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) setHintUsed(true); }}><summary className="cursor-pointer font-medium">Show hint</summary><p className="mt-2">{exercise.hint}</p></details> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {result ? <div className={`mt-4 rounded-lg p-3 text-sm ${result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`} role="status"><p className="font-semibold">{result.isCorrect ? `Correct — ${result.scoreAwarded} points` : "Not quite"}</p><p className="mt-1 text-xs">Attempt {result.attemptNumber}</p></div> : null}
    {visibleFeedback ? <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">{visibleFeedback.correctAnswer !== null && !result?.isCorrect ? <p>Correct answer: {displayAnswer(visibleFeedback.correctAnswer)}</p> : null}{visibleFeedback.explanation ? <p className="mt-1">{visibleFeedback.explanation}</p> : null}{visibleFeedback.feedback?.example ? <p className="mt-2 rounded bg-blue-50 p-2">Example: {visibleFeedback.feedback.example}</p> : null}{visibleFeedback.feedback?.theoryHref ? <Link href={visibleFeedback.feedback.theoryHref} className="mt-2 inline-block font-semibold text-blue-700 hover:underline">Review the rule</Link> : null}{visibleFeedback.feedback?.errorDetails.length ? <details className="mt-3"><summary className="cursor-pointer font-semibold">Show all errors</summary><ul className="mt-2 space-y-2">{visibleFeedback.feedback.errorDetails.map((detail, index) => <li key={`${detail.incorrect}-${index}`}><s>{detail.incorrect}</s> → <strong>{detail.correction}</strong>{detail.explanation ? ` — ${detail.explanation}` : ""}</li>)}</ul></details> : null}</div> : null}
    {result?.solution?.available && !solution ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{confirmSolution ? <><p>Open the full solution for {result.solution.cost} coins? It can reduce points earned on a later correct attempt.</p><div className="mt-2 flex gap-3"><button type="button" onClick={openSolution} disabled={solutionSending} className="rounded bg-amber-700 px-3 py-2 font-semibold text-white disabled:opacity-60">{solutionSending ? "Opening…" : "Confirm"}</button><button type="button" onClick={() => setConfirmSolution(false)} className="font-semibold underline">Cancel</button></div></> : <button type="button" onClick={() => setConfirmSolution(true)} className="font-semibold underline">Open solution ({result.solution.cost} coins)</button>}</div> : null}
    {result && exercise.allowExtraExercise && !extraExercise ? <button type="button" onClick={loadExtraPractice} disabled={extraSending} className="mt-3 text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60">{extraSending ? "Preparing extra practice…" : "Try another exercise in this lesson"}</button> : null}
    {extraExercise ? <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="mb-3 text-base font-bold text-slate-900">Extra practice</h3><ExerciseRenderer exercise={extraExercise} /></div> : null}
  </section>;
}
