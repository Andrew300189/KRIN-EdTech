"use client";

/* eslint-disable @next/next/no-img-element -- Published lesson images can come from the CMS media URL configured by the owner. */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { asObject, asStringArray, displayAnswer, type JsonObject, type LessonExercise } from "./lesson-content";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { getExerciseEngine } from "@/modules/cms/exercise-engines/registry";
import { answerMatches, contentWithOrderSensitiveAnswerValidation } from "@/modules/courses/utils/exercise-evaluation";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

type Feedback = { example: string | null; theoryHref: string | null; errorDetails: Array<{ incorrect: string; correction: string; explanation: string | null }> };
type AttemptResult = {
  isCorrect: boolean; scoreAwarded: number; score: number; attemptNumber: number;
  explanation: string | null; correctAnswer: unknown; hint: string | null;
  openMistakeCount?: number;
  feedback?: Feedback | null;
  solution?: { available: boolean; cost: number; opened: boolean } | null;
  motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean };
};
type SolutionResult = { alreadyOpened: boolean; cost: number; balance: number; correctAnswer: unknown; explanation: string | null; feedback: Feedback };

function mediaUrl(value: unknown) {
  return typeof value === "string" && /^(https?:)?\/\//.test(value) ? value : null;
}

function stepContext(value: unknown) {
  const context = asObject(asObject(value).authoringContext);
  return {
    visible: context.visible !== false,
    text: typeof context.text === "string" ? context.text : "",
    audioUrl: mediaUrl(context.audioUrl),
    imageUrl: mediaUrl(context.imageUrl),
    videoUrl: mediaUrl(context.videoUrl),
  };
}

function isMultipleChoice(exercise: LessonExercise) {
  return exercise.engineKey === "multiple-choice" || exercise.engineKey === "multi-choice" || exercise.type === "MULTIPLE_CHOICE";
}

type ExerciseRendererProps = {
  exercise: LessonExercise;
  /** CMS previews evaluate a draft locally and never expose answers to a public route. */
  previewMode?: boolean;
  hideContext?: boolean;
  hideContextText?: boolean;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean }) => void;
  /** Keep an incorrect answer in the review queue and continue without retrying it now. */
  onDefer?: (exerciseId: string) => void;
  /** Server-validated review queue; never trusted as a general access bypass. */
  reviewRunId?: string;
};

type ExerciseAnswer = string | string[] | JsonObject;

function hasAnswerValue(answer: ExerciseAnswer) {
  if (typeof answer === "string") return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return Object.values(answer).some((value) => typeof value === "string" && value.trim().length > 0);
}

/**
 * Keep word-order exercises solvable while ensuring their source order does
 * not reveal the answer. The exercise id makes the shuffle stable during an
 * attempt, so a re-render never moves a token under the learner's cursor.
 */
function shuffleTokens(tokens: string[], seed: string, protectedOrder: string[] = tokens) {
  if (tokens.length < 2) return [...tokens];
  let initialState = 2_166_136_261;
  for (const character of seed) {
    initialState ^= character.charCodeAt(0);
    initialState = Math.imul(initialState, 16_777_619);
  }

  const originalPairs = new Set(protectedOrder.slice(0, -1).map((token, index) => `${token}\u0000${protectedOrder[index + 1]}`));
  const closeness = (candidate: string[]) => {
    const fixedTokens = candidate.filter((token, index) => token === protectedOrder[index]).length;
    const originalNeighbours = candidate.slice(0, -1)
      .filter((token, index) => originalPairs.has(`${token}\u0000${candidate[index + 1]}`)).length;
    // Keeping a correct neighbouring pair is a stronger clue than keeping a
    // single word in its original position. Prefer breaking every source
    // phrase fragment before optimising the remaining card positions.
    return (originalNeighbours * 100) + fixedTokens;
  };

  let best = [...tokens].reverse();
  let bestScore = closeness(best);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = [...tokens];
    let state = initialState ^ Math.imul(attempt + 1, 2_654_435_761);
    for (let index = candidate.length - 1; index > 0; index -= 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const target = (state >>> 0) % (index + 1);
      [candidate[index], candidate[target]] = [candidate[target], candidate[index]];
    }
    const score = closeness(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
    // A deranged sequence without an original word pair gives no useful clue
    // about the sentence while staying deterministic for the current attempt.
    if (score === 0) return candidate;
  }

  if (best.every((token, index) => token === protectedOrder[index])) {
    return [...tokens.slice(1), tokens[0]];
  }
  return best;
}

/** Keep punctuation in the validated answer, but not on a word card. */
function displaySentenceBuilderToken(token: string) {
  return token.replace(/\.+$/u, "");
}

function toBeMatchingForm(value: string) {
  const match = value.trim().match(/^(am|is|are)(?:\s*[—–-]\s*|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function normalizeMatchingForm(value: string) {
  return value.trim().toLowerCase().replace(/[.!?]+$/u, "");
}

export function ExerciseRenderer({ exercise, previewMode = false, hideContext = false, hideContextText = false, onAttemptResolved, onDefer, reviewRunId }: ExerciseRendererProps) {
  const content = useMemo(() => asObject(exercise.content), [exercise.content]);
  const context = useMemo(() => stepContext(exercise.content), [exercise.content]);
  const options = useMemo(() => asStringArray(content.options), [content]);
  const matchingLeft = useMemo(() => asStringArray(content.left), [content]);
  const matchingRight = useMemo(() => asStringArray(content.right), [content]);
  const compactToBeMatching = useMemo(() => {
    const forms = matchingRight.map(toBeMatchingForm);
    if (!forms.length || forms.some((form) => !form)) return null;
    const available = new Set(forms as string[]);
    return ["am", "is", "are"].filter((form) => available.has(form));
  }, [matchingRight]);
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
  const correctedWordOnly = exercise.engineKey === "find-and-correct" && content.answerMode === "CORRECTED_TOKEN";
  const initialAnswer = useMemo<ExerciseAnswer>(() => multiple || ordered ? [] : matching || classification ? {} : "", [classification, matching, multiple, ordered]);
  const [answer, setAnswer] = useState<ExerciseAnswer>(initialAnswer);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [solution, setSolution] = useState<SolutionResult | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [extraExercise, setExtraExercise] = useState<LessonExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [solutionSending, setSolutionSending] = useState(false);
  const [extraSending, setExtraSending] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const submissionInFlightRef = useRef(false);
  const textCheckTimerRef = useRef<number | null>(null);
  const answerEvaluationContent = useMemo(
    () => contentWithOrderSensitiveAnswerValidation(content, exercise.engineKey),
    [content, exercise.engineKey],
  );
  const correctOrderedTokens = useMemo(
    () => Array.isArray(exercise.correctAnswer)
      ? exercise.correctAnswer.filter((token): token is string => typeof token === "string")
      : options,
    [exercise.correctAnswer, options],
  );
  const orderedOptions = useMemo(() => (
    ordered
      ? shuffleTokens(options, exercise.id, correctOrderedTokens)
      : options
  ), [correctOrderedTokens, exercise.id, options, ordered]);

  const expectedChoiceCount = Array.isArray(exercise.correctAnswer) ? exercise.correctAnswer.length : 1;
  const inputsLocked = sending || result !== null;

  function changeAnswer(next: ExerciseAnswer) {
    setAnswer(next); setResult(null); setSolution(null); setConfirmSolution(false);
  }

  function compactMatchingSubmission(candidate: JsonObject) {
    if (!compactToBeMatching) return candidate;
    const expectedAnswers = asObject(exercise.correctAnswer);
    return Object.fromEntries(Object.entries(candidate).map(([leftItem, rawForm]) => {
      const form = typeof rawForm === "string" ? normalizeMatchingForm(rawForm) : "";
      const expected = expectedAnswers[leftItem];
      const expectedValue = typeof expected === "string" ? expected : "";
      const submittedValue = toBeMatchingForm(expectedValue) === form
        ? expectedValue
        : matchingRight.find((item) => toBeMatchingForm(item) === form) ?? form;
      return [leftItem, submittedValue];
    }));
  }

  function clearTextCheckTimer() {
    if (textCheckTimerRef.current === null) return;
    window.clearTimeout(textCheckTimerRef.current);
    textCheckTimerRef.current = null;
  }

  function scheduleTextCheck(value: string) {
    clearTextCheckTimer();
    if (!value.trim()) return;
    // Short one-word answers have no explicit submit button. Check shortly
    // after the learner stops typing, while Enter or blur still checks now.
    textCheckTimerRef.current = window.setTimeout(() => {
      textCheckTimerRef.current = null;
      void checkAnswer(value);
    }, 750);
  }

  function restartExercise() {
    submissionInFlightRef.current = false;
    setAnswer(initialAnswer);
    setResult(null);
    setSolution(null);
    setConfirmSolution(false);
    setError(null);
    setHintUsed(false);
    setAttemptStartedAt(Date.now());
  }

  async function checkAnswer(answerToCheck: ExerciseAnswer = answer) {
    clearTextCheckTimer();
    if (!hasAnswerValue(answerToCheck) || submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    setSending(true); setError(null);
    if (previewMode) {
      const isCorrect = answerMatches(answerToCheck, exercise.correctAnswer, Array.isArray(exercise.alternativeAnswers) ? exercise.alternativeAnswers : [], answerEvaluationContent);
      const scoreAwarded = isCorrect ? exercise.basePoints : -exercise.basePoints;
      setResult({ isCorrect, scoreAwarded, score: scoreAwarded, attemptNumber: 1, explanation: exercise.explanation, correctAnswer: exercise.correctAnswer ?? null, hint: exercise.hint });
      onAttemptResolved?.({ exerciseId: exercise.id, isCorrect });
      setSending(false);
      submissionInFlightRef.current = false;
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: answerToCheck, idempotencyKey, hintUsed, timeSpentSeconds: Math.max(0, Math.round((Date.now() - attemptStartedAt) / 1000)), ...(reviewRunId ? { reviewRunId } : {}) }) });
      const payload = await response.json() as { data?: AttemptResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to check the answer. Please sign in and try again."); return; }
      setResult(payload.data);
      onAttemptResolved?.({ exerciseId: exercise.id, isCorrect: payload.data.isCorrect });
      if (typeof payload.data.openMistakeCount === "number") {
        window.dispatchEvent(new CustomEvent("mistakes:changed", { detail: { count: payload.data.openMistakeCount } }));
      }
      if (payload.data.motivationReward?.awarded) {
        notifyMotivationUpdated();
      }
    } catch { setError("Unable to check the answer. Please try again."); }
    finally { setSending(false); submissionInFlightRef.current = false; }
  }

  async function openSolution() {
    setSolutionSending(true); setError(null);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/solution`, { method: "POST" });
      const payload = await response.json() as { data?: SolutionResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to open the solution."); return; }
      setSolution(payload.data); setConfirmSolution(false); notifyMotivationUpdated();
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
  const visibleFeedback = solution ? { explanation: solution.explanation, correctAnswer: solution.correctAnswer, feedback: solution.feedback } : result?.isCorrect ? result : null;
  const visibleInstruction = compactToBeMatching ? "Впишите правильную форму: am, is или are." : exercise.instruction;

  return <section className={`lesson-exercise-card rounded-xl border border-slate-200 bg-slate-50 p-5 ${result?.isCorrect ? "focus-answer-correct" : result ? "focus-answer-incorrect" : ""}`} aria-label={visibleInstruction}>
    {result?.isCorrect ? <div className="lesson-correct-celebration" role="status" aria-live="polite">
      {result.motivationReward?.awarded
        ? <><strong>+{result.motivationReward.experience} XP</strong>{result.motivationReward.levelUp ? <span>Level up!</span> : null}</>
        : <strong>Well done</strong>}
    </div> : null}
    {!hideContext && context.visible && ((context.text && !hideContextText) || context.audioUrl || context.imageUrl || context.videoUrl) ? <section className="lesson-exercise-context mb-4 rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Before you answer</p>{context.text && !hideContextText ? <div className="lesson-rich-content mt-2 text-sm leading-6 text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(context.text) }} /> : null}{context.imageUrl ? <img src={context.imageUrl} alt="Lesson theory illustration" className="mt-3 max-h-64 rounded-lg object-cover" /> : null}{context.audioUrl ? <audio className="mt-3 w-full" controls preload="metadata" src={context.audioUrl}>Your browser does not support audio playback.</audio> : null}{context.videoUrl ? <video className="mt-3 max-h-80 w-full rounded-lg" controls preload="metadata" src={context.videoUrl}>Your browser does not support audio playback.</video> : null}</section> : null}
    <div className="lesson-exercise-heading flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{visibleInstruction}</p>{result && !result.isCorrect ? <span className="lesson-exercise-inline-status" role="status">Not quite · saved for review <button type="button" onClick={restartExercise} className="lesson-exercise-inline-retry">Try again</button></span> : null}</div>
    {passage ? <article className="lesson-exercise-passage mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800" aria-label="Reading passage">{passage}</article> : null}
    {audio ? <audio className="mt-3 w-full" controls preload="metadata" src={audio}>Your browser does not support audio playback.</audio> : null}
    {video ? <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={video}>Your browser does not support video playback.</video> : null}
    {!compactToBeMatching ? <p className="lesson-exercise-question mt-3 text-slate-700">{exercise.question}</p> : null}
    {result && !result.isCorrect && (result.hint ?? exercise.hint) ? <p className="lesson-exercise-inline-hint" role="status"><strong>Hint:</strong> {result.hint ?? exercise.hint}</p> : null}
    <div className="lesson-exercise-answer-list mt-4 space-y-2">
      {choice && options.map((option) => { const selected = multiple ? (answer as string[]).includes(option) : answer === option; return <label key={option} className="lesson-exercise-choice flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus-within:ring-2 focus-within:ring-blue-500"><input type={multiple ? "checkbox" : "radio"} name={exercise.id} checked={selected} disabled={inputsLocked} onChange={() => { const next = multiple ? (selected ? (answer as string[]).filter((item) => item !== option) : [...answer as string[], option]) : option; changeAnswer(next); if (!multiple || (next as string[]).length === expectedChoiceCount) void checkAnswer(next); }} /><span>{option}</span></label>; })}
      {matching && compactToBeMatching && matchingLeft.map((leftItem) => {
        const current = String((answer as JsonObject)[leftItem] ?? "");
        return <label key={leftItem} className="lesson-exercise-text-answer block"><span className="lesson-exercise-question mb-2 block text-slate-800">{leftItem}</span><span className="lesson-exercise-answer-label">Впишите слово</span><input disabled={inputsLocked} value={current} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [leftItem]: event.target.value })} onBlur={(event) => {
          const next = { ...(answer as JsonObject), [leftItem]: event.currentTarget.value };
          if (matchingLeft.every((item) => typeof next[item] === "string" && String(next[item]).trim())) void checkAnswer(compactMatchingSubmission(next));
        }} onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const next = { ...(answer as JsonObject), [leftItem]: event.currentTarget.value };
          if (matchingLeft.every((item) => typeof next[item] === "string" && String(next[item]).trim())) void checkAnswer(compactMatchingSubmission(next));
        }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60" placeholder="am, is или are" autoComplete="off" /></label>;
      })}
      {matching && !compactToBeMatching && matchingLeft.map((leftItem) => {
        const storedValue = String((answer as JsonObject)[leftItem] ?? "");
        return <label key={leftItem} className="lesson-exercise-match-row grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{leftItem}</span><select disabled={inputsLocked} className="lesson-exercise-select rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" value={storedValue} onChange={(event) => {
          const next = { ...(answer as JsonObject), [leftItem]: event.target.value };
          changeAnswer(next);
          if (matchingLeft.every((item) => typeof next[item] === "string" && next[item])) void checkAnswer(next);
        }}><option value="">Choose a match</option>{matchingRight.map((rightItem, optionIndex) => <option key={`${rightItem}-${optionIndex}`} value={rightItem}>{rightItem}</option>)}</select></label>;
      })}
      {ordered ? <><div className="lesson-exercise-token-bank flex flex-wrap gap-2" aria-label="Available tokens">{orderedOptions.map((option, index) => { const selected = (answer as string[]).includes(option); return <button key={`${option}-${index}`} type="button" disabled={inputsLocked || selected} onClick={() => { const next = [...answer as string[], option]; changeAnswer(next); if (next.length === options.length) void checkAnswer(next); }} className="lesson-exercise-token rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{displaySentenceBuilderToken(option)}</button>; })}</div><ul className="lesson-exercise-token-answer list-none flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-700" aria-label="Selected order">{(answer as string[]).map((token, index) => <li key={`${token}-${index}`}><button type="button" disabled={inputsLocked} onClick={() => changeAnswer((answer as string[]).filter((_, tokenIndex) => tokenIndex !== index))} className="lesson-exercise-token-selected rounded bg-blue-50 px-2 py-1 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Remove ${token}`}>{displaySentenceBuilderToken(token)}</button></li>)}</ul><button type="button" disabled={inputsLocked} onClick={() => changeAnswer([])} className="lesson-exercise-reset text-sm font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50">Reset order</button></> : null}
      {classification && classificationItems.map((item) => <label key={item} className="lesson-exercise-match-row grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select disabled={inputsLocked} className="lesson-exercise-select rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" value={String((answer as JsonObject)[item] ?? "")} onChange={(event) => { const next = { ...(answer as JsonObject), [item]: event.target.value }; changeAnswer(next); if (classificationItems.every((classificationItem) => typeof next[classificationItem] === "string" && next[classificationItem])) void checkAnswer(next); }}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>)}
      {!choice && !matching && !ordered && !classification ? <label className="lesson-exercise-text-answer block"><span className="lesson-exercise-answer-label">{correctedWordOnly ? "Correct word" : "Your answer"}</span>{longText ? <textarea disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void checkAnswer(event.currentTarget.value); } }} rows={5} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60" placeholder={renderer === "recording" ? "Write a transcript or response for review" : "Write your answer"} /> : <input disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => { changeAnswer(event.target.value); scheduleTextCheck(event.target.value); }} onBlur={(event) => { if (event.currentTarget.value.trim()) void checkAnswer(event.currentTarget.value); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void checkAnswer(event.currentTarget.value); } }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60" placeholder={correctedWordOnly ? "Type only the corrected word" : "Type your answer"} />}</label> : null}
    </div>
    {sending ? <p className="mt-4 text-sm font-medium text-blue-700" role="status">Checking…</p> : null}
    {!result && exercise.hintsEnabled && exercise.hint ? <details className="lesson-exercise-hint-trigger mt-3 text-sm text-slate-600" onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) setHintUsed(true); }}><summary className="cursor-pointer font-medium">Show hint</summary><p className="mt-2">{exercise.hint}</p></details> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {result && !result.isCorrect ? <section className="lesson-exercise-result lesson-exercise-result-error"><div className="lesson-exercise-result-actions">{onDefer ? <button type="button" onClick={() => onDefer(exercise.id)} className="lesson-exercise-action lesson-exercise-action-later" aria-label="Continue later and keep this task in your mistakes">Later</button> : null}{result.solution?.available && !solution ? (confirmSolution ? <div className="lesson-exercise-solution-confirm"><span>{result.solution.opened ? "Show the saved solution?" : `Show solution for ${result.solution.cost} XP?`}</span><button type="button" onClick={openSolution} disabled={solutionSending} className="lesson-exercise-action lesson-exercise-action-primary">{solutionSending ? "Opening…" : "Show solution"}</button><button type="button" onClick={() => setConfirmSolution(false)} className="lesson-exercise-action lesson-exercise-action-quiet">Cancel</button></div> : <button type="button" onClick={() => setConfirmSolution(true)} className="lesson-exercise-action lesson-exercise-action-solution">{result.solution.opened ? "Show solution" : `Show solution · ${result.solution.cost} XP`}</button>) : null}</div></section> : null}
    {visibleFeedback ? <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">{visibleFeedback.correctAnswer !== null && !result?.isCorrect ? <p>Correct answer: {displayAnswer(visibleFeedback.correctAnswer)}</p> : null}{visibleFeedback.explanation ? <p className="mt-1">{visibleFeedback.explanation}</p> : null}{visibleFeedback.feedback?.example ? <p className="mt-2 rounded bg-blue-50 p-2">Example: {visibleFeedback.feedback.example}</p> : null}{visibleFeedback.feedback?.theoryHref ? <Link href={visibleFeedback.feedback.theoryHref} className="mt-2 inline-block font-semibold text-blue-700 hover:underline">Review the rule</Link> : null}{visibleFeedback.feedback?.errorDetails.length ? <details className="mt-3"><summary className="cursor-pointer font-semibold">Show all errors</summary><ul className="mt-2 space-y-2">{visibleFeedback.feedback.errorDetails.map((detail, index) => <li key={`${detail.incorrect}-${index}`}><s>{detail.incorrect}</s> → <strong>{detail.correction}</strong>{detail.explanation ? ` — ${detail.explanation}` : ""}</li>)}</ul></details> : null}</div> : null}
    {result?.isCorrect && exercise.allowExtraExercise && !extraExercise ? <button type="button" onClick={loadExtraPractice} disabled={extraSending} className="mt-3 text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60">{extraSending ? "Preparing extra practice…" : "Try another exercise in this lesson"}</button> : null}
    {extraExercise ? <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="mb-3 text-base font-bold text-slate-900">Extra practice</h3><ExerciseRenderer exercise={extraExercise} /></div> : null}
  </section>;
}
