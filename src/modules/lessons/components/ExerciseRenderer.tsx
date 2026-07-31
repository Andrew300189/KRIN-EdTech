"use client";

import { useMemo, useState } from "react";
import { asObject, asStringArray, displayAnswer, type JsonObject, type LessonExercise } from "./lesson-content";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";

type AttemptResult = {
  isCorrect: boolean;
  scoreAwarded: number;
  score: number;
  attemptNumber: number;
  explanation: string | null;
  correctAnswer: unknown;
  hint: string | null;
  motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean };
};

const choiceTypes = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SYNONYM_SELECTION", "ANTONYM_SELECTION", "PHRASAL_VERB_MEANING", "VERB_PREPOSITION", "TENSE_SELECTION"]);
const orderedTypes = new Set(["WORD_ORDER", "SENTENCE_ORDER"]);

export function ExerciseRenderer({ exercise }: { exercise: LessonExercise }) {
  const content = useMemo(() => asObject(exercise.content), [exercise.content]);
  const options = useMemo(() => asStringArray(content.options), [content]);
  const matchingLeft = useMemo(() => asStringArray(content.left), [content]);
  const matchingRight = useMemo(() => asStringArray(content.right), [content]);
  const isMultipleChoice = exercise.type === "MULTIPLE_CHOICE";
  const isChoice = choiceTypes.has(exercise.type);
  const isMatching = exercise.type === "MATCHING";
  const isOrdered = orderedTypes.has(exercise.type);
  const [answer, setAnswer] = useState<string | string[] | JsonObject>(isMultipleChoice || isOrdered ? [] : isMatching ? {} : "");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);

  function changeAnswer(next: string | string[] | JsonObject) {
    setAnswer(next);
    setResult(null);
    setIdempotencyKey(null);
  }

  async function checkAnswer() {
    setSending(true);
    setError(null);
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, idempotencyKey: key }),
      });
      const payload = await response.json() as { data?: AttemptResult; error?: string };
      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Unable to check the answer. Please sign in and try again.");
        return;
      }
      setResult(payload.data);
      if (payload.data.motivationReward?.awarded) {
        const reward = payload.data.motivationReward;
        setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "XP earned", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
      }
    } catch {
      setError("Unable to check the answer. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-5" aria-label={exercise.instruction}>
    <RewardNotification events={rewardEvents} />
    <p className="font-medium text-slate-900">{exercise.instruction}</p><p className="mt-2 text-slate-700">{exercise.question}</p>
    <div className="mt-4 space-y-2">
      {isChoice && options.map((option) => { const selected = isMultipleChoice ? (answer as string[]).includes(option) : answer === option; return <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus-within:ring-2 focus-within:ring-blue-500"><input type={isMultipleChoice ? "checkbox" : "radio"} name={exercise.id} checked={selected} onChange={() => changeAnswer(isMultipleChoice ? (selected ? (answer as string[]).filter((item) => item !== option) : [...answer as string[], option]) : option)} /><span>{option}</span></label>; })}
      {isMatching && matchingLeft.map((leftItem) => <label key={leftItem} className="grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{leftItem}</span><select className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={String((answer as JsonObject)[leftItem] ?? "")} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [leftItem]: event.target.value })}><option value="">Choose a match</option>{matchingRight.map((rightItem) => <option key={rightItem} value={rightItem}>{rightItem}</option>)}</select></label>)}
      {isOrdered ? <><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => changeAnswer([...(answer as string[]), option])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-blue-50">{option}</button>)}</div><div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-700">{(answer as string[]).length ? (answer as string[]).join(" ") : "Choose tokens in order."}</div><button type="button" onClick={() => changeAnswer([])} className="text-sm font-semibold text-blue-700 hover:underline">Reset order</button></> : null}
      {!isChoice && !isMatching && !isOrdered ? <label className="block"><span className="sr-only">Your answer</span><input value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Type your answer" /></label> : null}
    </div>
    <button type="button" onClick={checkAnswer} disabled={sending} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{sending ? "Checking…" : "Check answer"}</button>
    {exercise.hint ? <details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Show hint</summary><p className="mt-2">{exercise.hint}</p></details> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {result ? <div className={`mt-4 rounded-lg p-3 text-sm ${result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`} role="status"><p className="font-semibold">{result.isCorrect ? `Correct — ${result.scoreAwarded} points` : "Not quite"}</p><p className="mt-1 text-xs">Attempt {result.attemptNumber}</p>{!result.isCorrect && result.correctAnswer !== null ? <p className="mt-1">Correct answer: {displayAnswer(result.correctAnswer)}</p> : null}{result.explanation ? <p className="mt-1">{result.explanation}</p> : null}</div> : null}
  </section>;
}
