"use client";

/* eslint-disable @next/next/no-img-element -- Published lesson images can come from the CMS media URL configured by the owner. */

import Link from "next/link";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import styles from "./ExerciseRenderer.module.css";
import { asObject, asStringArray, displayAnswer, type JsonObject, type LessonExercise } from "./lesson-content";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { getExerciseEngine } from "@/modules/cms/exercise-engines/registry";
import { answerMatches, contentWithOrderSensitiveAnswerValidation } from "@/modules/courses/utils/exercise-evaluation";
import { getAuthoredExerciseTranslation, getExerciseTranslationTarget } from "@/modules/courses/utils/exercise-translation-source";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";
import { learnerFriendlyHint } from "@/modules/lessons/utils/learner-friendly-hints";
import { primeLessonSuccessSound } from "@/modules/lessons/utils/success-sound";
import { useLocale } from "@/core/i18n/locale";
import { learnerAnswerFeedback } from "@/core/i18n/learner-answer-feedback";

type Feedback = { example: string | null; theoryHref: string | null; errorDetails: Array<{ incorrect: string; correction: string; explanation: string | null }> };
type AttemptResult = {
  isCorrect: boolean; scoreAwarded: number; score: number; attemptNumber: number;
  explanation: string | null; correctAnswer: unknown; hint: string | null;
  openMistakeCount?: number;
  feedback?: Feedback | null;
  solution?: { available: boolean; cost: number; opened: boolean } | null;
  motivationReward?: {
    awarded: boolean;
    experience: number;
    coins: number;
    levelUp: boolean;
    baseExperience?: number;
    streakBonus?: number;
    streak?: { current: number; modeStart: number | null; bonusExperience: number; tone: string | null; activated: boolean } | null;
  };
};
type SolutionResult = { alreadyOpened: boolean; cost: number; balance: number; correctAnswer: unknown; explanation: string | null; feedback: Feedback };
type TranslationResult = { translation: string; alreadyPurchased: boolean; cost: number; balance: number; bonusUsed?: boolean; remainingCredits?: number };
type HintPurchaseResult = { alreadyPurchased: boolean; cost: number; balance: number; bonusUsed?: boolean; remainingCredits?: number; freeFallback?: boolean };

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
  /** The locale of the course route takes priority over a saved site setting. */
  contentLocale?: "ru" | "uk";
  /** Active mode survives question changes until a wrong first answer resets it. */
  persistentStreakTone?: string | null;
  /** CMS previews evaluate a draft locally and never expose answers to a public route. */
  previewMode?: boolean;
  hideContext?: boolean;
  hideContextText?: boolean;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; streakTone?: string | null; streakMilestone?: number | null }) => void;
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

/**
 * Authors naturally tend to place the answer first (or in one familiar slot).
 * Keep the order stable for a given card — so it never jumps during React
 * renders — but rearrange every choice card with its own exercise id. A lone
 * correct answer is also deliberately moved away from its authored position.
 */
function shuffleChoiceOptions(options: string[], exerciseId: string, correctAnswer: unknown) {
  if (options.length < 2) return options;
  const shuffled = shuffleTokens(options, `${exerciseId}:choice-options`, []);
  const correctValues = Array.isArray(correctAnswer)
    ? correctAnswer.filter((value): value is string => typeof value === "string")
    : typeof correctAnswer === "string" ? [correctAnswer] : [];

  // For a single-answer card, never preserve the position the author used.
  // That prevents an accidentally consistent first/third answer pattern while
  // still leaving server-side answer evaluation entirely value based.
  if (correctValues.length === 1) {
    const authoredIndex = options.indexOf(correctValues[0]);
    const shuffledIndex = shuffled.indexOf(correctValues[0]);
    if (authoredIndex >= 0 && authoredIndex === shuffledIndex) {
      const nextIndex = (shuffledIndex + 1) % shuffled.length;
      [shuffled[shuffledIndex], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[shuffledIndex]];
    }
  }
  return shuffled;
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

function displayTranslation(value: string) {
  return value.trim().replace(/^(?:translation|перевод|переклад)\s*:\s*/iu, "");
}

function explanationAlreadyStatesAnswer(explanation: string | null | undefined, answer: unknown) {
  if (!explanation?.trim()) return false;
  const visibleAnswer = displayAnswer(answer).trim().toLocaleLowerCase();
  return visibleAnswer.length > 0 && explanation.toLocaleLowerCase().includes(visibleAnswer);
}

function AnswerReveal({ answer }: { answer: unknown }) {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    const pairs = Object.entries(answer as JsonObject)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0);
    if (pairs.length) {
      return <dl className="lesson-exercise-answer-reveal-list">
        {pairs.map(([source, target]) => <div key={source}>
          <dt>{source}</dt>
          <dd>{String(target)}</dd>
        </div>)}
      </dl>;
    }
  }
  return <strong className="lesson-exercise-answer-reveal-value">{displayAnswer(answer)}</strong>;
}

export function ExerciseRenderer({ exercise, contentLocale, persistentStreakTone = null, previewMode = false, hideContext = false, hideContextText = false, onAttemptResolved, onDefer, reviewRunId }: ExerciseRendererProps) {
  const { locale: selectedLocale } = useLocale();
  const locale = contentLocale ?? selectedLocale;
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
  const [translation, setTranslation] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSending, setTranslationSending] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const submissionInFlightRef = useRef(false);
  const translationRequestRef = useRef(0);
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
  const choiceOptions = useMemo(() => (
    choice ? shuffleChoiceOptions(options, exercise.id, exercise.correctAnswer) : options
  ), [choice, exercise.correctAnswer, exercise.id, options]);
  const matchingOptions = useMemo(() => (
    matching && !compactToBeMatching
      ? shuffleTokens(matchingRight, `${exercise.id}:matching-options`, [])
      : matchingRight
  ), [compactToBeMatching, exercise.id, matching, matchingRight]);
  const categoryOptions = useMemo(() => (
    classification ? shuffleTokens(categories, `${exercise.id}:category-options`, []) : categories
  ), [categories, classification, exercise.id]);
  const translationTarget = useMemo(
    () => getExerciseTranslationTarget({ question: exercise.question, content }),
    [content, exercise.question],
  );
  const authoredTranslation = useMemo(
    () => getAuthoredExerciseTranslation(content, translationTarget),
    [content, translationTarget],
  );
  const translationSource = translationTarget.source;
  const visibleHint = learnerFriendlyHint(exercise, locale);

  useEffect(() => { if (error) toast.error(error); }, [error]);
  useEffect(() => { if (translationError) toast.error(translationError); }, [translationError]);

  const expectedChoiceCount = Array.isArray(exercise.correctAnswer) ? exercise.correctAnswer.length : 1;
  const inputsLocked = sending || result !== null;
  const hasCompleteAnswer = (() => {
    if (matching || classification) {
      const requiredItems = matching ? matchingLeft : classificationItems;
      return requiredItems.length > 0 && requiredItems.every((item) => {
        const value = (answer as JsonObject)[item];
        return typeof value === "string" && value.trim().length > 0;
      });
    }
    if (ordered) return options.length > 0 && (answer as string[]).length === options.length;
    if (choice && multiple) return (answer as string[]).length === expectedChoiceCount;
    return hasAnswerValue(answer);
  })();

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

  function restartExercise() {
    submissionInFlightRef.current = false;
    translationRequestRef.current += 1;
    setAnswer(initialAnswer);
    setResult(null);
    setSolution(null);
    setConfirmSolution(false);
    setError(null);
    setHintOpen(false);
    setHintUsed(false);
    setTranslation(null);
    setTranslationError(null);
    setTranslationSending(false);
    setAttemptStartedAt(Date.now());
  }

  async function checkAnswer(answerToCheck: ExerciseAnswer = answer) {
    if (!hasAnswerValue(answerToCheck) || submissionInFlightRef.current) return;
    // Prime inside the click/Enter gesture. It plays only after the server
    // confirms a correct answer, but mobile browsers need this permission now.
    primeLessonSuccessSound();
    submissionInFlightRef.current = true;
    setSending(true); setError(null);
    if (previewMode) {
      const isCorrect = answerMatches(answerToCheck, exercise.correctAnswer, Array.isArray(exercise.alternativeAnswers) ? exercise.alternativeAnswers : [], answerEvaluationContent);
      const scoreAwarded = isCorrect ? exercise.basePoints : -exercise.basePoints;
      setResult({ isCorrect, scoreAwarded, score: scoreAwarded, attemptNumber: 1, explanation: exercise.explanation, correctAnswer: exercise.correctAnswer ?? null, hint: exercise.hint });
      if (!isCorrect) {
        clearTranslation();
        void revealHint();
      }
      onAttemptResolved?.({ exerciseId: exercise.id, isCorrect });
      setSending(false);
      submissionInFlightRef.current = false;
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json", ...(contentLocale ? { "x-krin-content-locale": contentLocale } : {}) }, body: JSON.stringify({ answer: answerToCheck, idempotencyKey, hintUsed, timeSpentSeconds: Math.max(0, Math.round((Date.now() - attemptStartedAt) / 1000)), ...(reviewRunId ? { reviewRunId } : {}) }) });
      const payload = await response.json() as { data?: AttemptResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to check the answer. Please sign in and try again."); return; }
      setResult(payload.data);
      if (!payload.data.isCorrect) {
        clearTranslation();
        void revealHint();
      }
      onAttemptResolved?.({
        exerciseId: exercise.id,
        isCorrect: payload.data.isCorrect,
        streakTone: payload.data.motivationReward?.streak?.tone ?? null,
        streakMilestone: payload.data.isCorrect
          && payload.data.motivationReward?.awarded
          && payload.data.motivationReward.streak?.activated
          ? payload.data.motivationReward.streak.modeStart
          : null,
      });
      if (typeof payload.data.openMistakeCount === "number") {
        window.dispatchEvent(new CustomEvent("mistakes:changed", { detail: { count: payload.data.openMistakeCount } }));
      }
      if (payload.data.motivationReward?.awarded) {
        notifyMotivationUpdated();
      }
    } catch { setError("Unable to check the answer. Please try again."); }
    finally { setSending(false); submissionInFlightRef.current = false; }
  }

  function submitSingleLineAnswerOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    // Use the native field value so the final character is never missed by a
    // pending React state update. checkAnswer still guards empty and replayed
    // submissions before it reaches the server.
    void checkAnswer(event.currentTarget.value);
  }

  function submitCompactMatchingOnEnter(event: KeyboardEvent<HTMLInputElement>, leftItem: string) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    // The final keystroke can still be pending in React state. Construct the
    // answer from the native field value so Enter checks the exact text the
    // learner sees, and only submit once every matching field is complete.
    const candidate = { ...(answer as JsonObject), [leftItem]: event.currentTarget.value };
    const isComplete = matchingLeft.length > 0 && matchingLeft.every((item) => {
      const value = candidate[item];
      return typeof value === "string" && value.trim().length > 0;
    });
    if (isComplete) void checkAnswer(compactMatchingSubmission(candidate));
  }

  function submitLongTextAnswerOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    // A plain Enter submits the response, while Shift+Enter remains available
    // for learners who need a new line in a longer written answer.
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.shiftKey) return;
    event.preventDefault();
    void checkAnswer(event.currentTarget.value);
  }

  function submitChoiceOnEnter(event: KeyboardEvent<HTMLInputElement>, option: string) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || inputsLocked) return;
    event.preventDefault();
    const selected = multiple ? (answer as string[]).includes(option) : answer === option;
    const next = multiple
      ? selected
        ? (answer as string[]).filter((item) => item !== option)
        : [...answer as string[], option]
      : option;
    changeAnswer(next);
    if (!multiple || (next as string[]).length === expectedChoiceCount) void checkAnswer(next);
  }

  function submitAssignedSelectOnEnter(event: KeyboardEvent<HTMLSelectElement>, item: string, isMatching: boolean) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || inputsLocked) return;
    const candidate = { ...(answer as JsonObject), [item]: event.currentTarget.value };
    const requiredItems = isMatching ? matchingLeft : classificationItems;
    const isComplete = requiredItems.length > 0 && requiredItems.every((requiredItem) => {
      const value = candidate[requiredItem];
      return typeof value === "string" && value.trim().length > 0;
    });
    // Keep the native select interaction available until all pairs have been
    // assigned. A subsequent Enter checks the completed answer.
    if (!isComplete) return;
    event.preventDefault();
    void checkAnswer(isMatching ? compactMatchingSubmission(candidate) : candidate);
  }

  function submitOrderedTokenOnEnter(event: KeyboardEvent<HTMLButtonElement>, option: string) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || inputsLocked || (answer as string[]).includes(option)) return;
    event.preventDefault();
    const next = [...answer as string[], option];
    changeAnswer(next);
    if (options.length > 0 && next.length === options.length) void checkAnswer(next);
  }

  async function toggleTranslation() {
    if (translation) {
      clearTranslation();
      return;
    }
    setTranslationError(null);
    if (previewMode) {
      if (authoredTranslation) setTranslation(displayTranslation(authoredTranslation));
      else setTranslationError("Translation is unavailable in preview.");
      return;
    }
    const requestId = ++translationRequestRef.current;
    setTranslationSending(true);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/translation`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: TranslationResult; error?: string } | null;
      if (!response.ok || !payload?.data?.translation) throw new Error(payload?.error ?? "Translation is temporarily unavailable.");
      if (requestId !== translationRequestRef.current) return;
      setTranslation(displayTranslation(payload.data.translation));
      if (payload.data.cost > 0 || payload.data.bonusUsed) notifyMotivationUpdated();
      if (payload.data.bonusUsed && !payload.data.alreadyPurchased) toast.success(locale === "uk" ? "Використано блакитний бонус перекладу" : locale === "ru" ? "Использован голубой бонус перевода" : "Translation credit used");
    } catch (caught) {
      if (requestId !== translationRequestRef.current) return;
      setTranslationError(caught instanceof Error ? caught.message : "Translation is temporarily unavailable.");
    } finally {
      if (requestId === translationRequestRef.current) setTranslationSending(false);
    }
  }

  function clearTranslation() {
    translationRequestRef.current += 1;
    setTranslation(null);
    setTranslationError(null);
    setTranslationSending(false);
  }

  async function revealHint() {
    if (hintOpen || !exercise.hintsEnabled || !visibleHint) return;
    if (previewMode) {
      setHintOpen(true);
      setHintUsed(true);
      return;
    }
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automatic: true }),
      });
      const payload = await response.json().catch(() => null) as { data?: HintPurchaseResult; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to show the hint.");
      setHintOpen(true);
      setHintUsed(!payload.data.freeFallback);
      if (payload.data.cost > 0 || payload.data.bonusUsed) notifyMotivationUpdated();
      if (payload.data.bonusUsed && !payload.data.alreadyPurchased) toast.success(locale === "uk" ? "Використано жовтий бонус підказки" : locale === "ru" ? "Использован жёлтый бонус подсказки" : "Hint credit used");
    } catch {
      // The hint text is already part of the loaded exercise. If billing is
      // temporarily unavailable, show the child-friendly help rather than a
      // technical server error after the learner has made a mistake.
      setHintOpen(true);
      setHintUsed(false);
    }
  }

  async function openSolution() {
    setSolutionSending(true); setError(null);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/solution`, {
        method: "POST",
        headers: contentLocale ? { "x-krin-content-locale": contentLocale } : undefined,
      });
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
  const visibleInstruction = compactToBeMatching
    ? locale === "uk"
      ? "Впишіть правильну форму: am, is або are."
      : locale === "ru"
        ? "Впишите правильную форму: am, is или are."
        : "Type the correct form: am, is, or are."
    : exercise.instruction;
  const answerFeedback = learnerAnswerFeedback(locale);
  const hintInlineLabel = locale === "uk" ? "Підказка:" : locale === "ru" ? "Подсказка:" : "Hint:";
  const translationPriceLabel = locale === "uk" ? "1 блакитний бонус або 2 XP" : locale === "ru" ? "1 голубой бонус или 2 XP" : "1 blue credit or 2 XP";
  const translationOpeningLabel = locale === "uk" ? "Готуємо…" : locale === "ru" ? "Готовим…" : "Preparing…";
  const translationHideLabel = locale === "uk" ? "Сховати переклад" : locale === "ru" ? "Скрыть перевод" : "Hide translation";
  const translationShowLabel = locale === "uk" ? "Показати переклад" : locale === "ru" ? "Показать перевод" : "Show translation";
  const retryLabel = locale === "uk" ? "Спробувати ще раз" : locale === "ru" ? "Попробовать ещё раз" : "Try again";
  const textAnswerLabel = correctedWordOnly
    ? locale === "uk" ? "Правильне слово" : locale === "ru" ? "Правильное слово" : "Correct word"
    : locale === "uk" ? "Ваша відповідь" : locale === "ru" ? "Ваш ответ" : "Your answer";
  const textAnswerPlaceholder = correctedWordOnly
    ? locale === "uk" ? "Впишіть лише правильне слово" : locale === "ru" ? "Введите только правильное слово" : "Type only the corrected word"
    : locale === "uk" ? "Впишіть свою відповідь" : locale === "ru" ? "Введите свой ответ" : "Type your answer";
  const solutionCopy = locale === "uk"
    ? { show: "Показати розв’язання", saved: "Показати збережене розв’язання?", confirm: "Показати розв’язання за {cost} XP?", opening: "Відкриваємо…", cancel: "Скасувати", later: "Відкласти", example: "Приклад:", reviewRule: "Повторити правило", allErrors: "Показати всі помилки" }
    : locale === "ru"
      ? { show: "Показать решение", saved: "Показать сохранённое решение?", confirm: "Показать решение за {cost} XP?", opening: "Открываем…", cancel: "Отмена", later: "Отложить", example: "Пример:", reviewRule: "Повторить правило", allErrors: "Показать все ошибки" }
      : { show: "Show solution", saved: "Show the saved solution?", confirm: "Show solution for {cost} XP?", opening: "Opening…", cancel: "Cancel", later: "Review later", example: "Example:", reviewRule: "Review the rule", allErrors: "Show all errors" };
  const incorrectCopy = locale === "uk"
    ? { title: "Ще трохи практики", description: solution ? "Розв’язання вже нижче. Розберіть його та спробуйте ще раз." : "Підказка вже відкрита. Спробуйте ще раз або відкладіть завдання до повторення.", solution: "Розв’язання" }
    : locale === "ru"
      ? { title: "Нужно ещё немного практики", description: solution ? "Решение уже ниже. Разберите его и попробуйте ещё раз." : "Подсказка уже открыта. Попробуйте ещё раз или отложите задание на повторение.", solution: "Решение" }
      : { title: "A little more practice", description: solution ? "The solution is below. Review it, then try again." : "The hint is open. Try again or save this task for review.", solution: "Solution" };
  const explanationLabel = locale === "uk" ? "Чому так" : locale === "ru" ? "Почему так" : "Why it works";
  const feedbackHint = visibleHint ?? result?.hint ?? exercise.hint;
  const streak = result?.motivationReward?.streak ?? null;
  const streakTone = streak?.tone && /^[a-z-]+$/.test(streak.tone) ? streak.tone : null;
  const activeStreakTone = result?.isCorrect ? streakTone : result ? null : persistentStreakTone;
  const activeStreakClass = activeStreakTone && /^[a-z-]+$/.test(activeStreakTone) ? ` lesson-exercise-streak-${activeStreakTone}` : "";
  const streakActivated = Boolean(result?.motivationReward?.awarded && streak?.activated && streakTone);

  return <section className={`${styles.card} lesson-exercise-card rounded-xl border border-slate-200 bg-slate-50 p-5 ${result?.isCorrect ? "focus-answer-correct" : result ? "focus-answer-incorrect" : ""}${activeStreakClass}`} aria-label={visibleInstruction}>
    {result?.isCorrect ? <div className="lesson-correct-celebration" role="status" aria-live="polite">
      {streakActivated
        ? <div className={`lesson-streak-celebration lesson-exercise-streak-${streakTone}`}><strong>×{streak?.modeStart}</strong></div>
        : result.motivationReward?.awarded
        ? <><strong>{answerFeedback.xpAwarded(result.motivationReward.experience)}</strong>{result.motivationReward.levelUp ? <span>Level up!</span> : null}</>
        : <strong>{answerFeedback.wellDone}</strong>}
    </div> : null}
    {!hideContext && context.visible && ((context.text && !hideContextText) || context.audioUrl || context.imageUrl || context.videoUrl) ? <section className="lesson-exercise-context mb-4 rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Before you answer</p>{context.text && !hideContextText ? <div className="lesson-rich-content mt-2 text-sm leading-6 text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(context.text) }} /> : null}{context.imageUrl ? <img src={context.imageUrl} alt="Lesson theory illustration" className="mt-3 max-h-64 rounded-lg object-cover" /> : null}{context.audioUrl ? <audio className="mt-3 w-full" controls preload="metadata" src={context.audioUrl}>Your browser does not support audio playback.</audio> : null}{context.videoUrl ? <video className="mt-3 max-h-80 w-full rounded-lg" controls preload="metadata" src={context.videoUrl}>Your browser does not support audio playback.</video> : null}</section> : null}
    <div className={`${styles.heading} lesson-exercise-heading`}><div className={`${styles.instruction} lesson-exercise-instruction`} role="note"><p>{visibleInstruction}</p></div></div>
    {passage ? <article className="lesson-exercise-passage mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800" aria-label="Reading passage">{passage}</article> : null}
    {audio ? <audio className="mt-3 w-full" controls preload="metadata" src={audio}>Your browser does not support audio playback.</audio> : null}
    {video ? <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={video}>Your browser does not support video playback.</video> : null}
    {!compactToBeMatching ? <div className={`${styles.questionRow} lesson-exercise-question-row`}><p className={`${styles.question} lesson-exercise-question text-slate-700`}>{exercise.question}</p>{translation ? <div className="lesson-exercise-translation-result" role="status">{translation}</div> : null}</div> : null}
    {compactToBeMatching && translation ? <div className="lesson-exercise-translation-result mt-3" role="status">{translation}</div> : null}
    {result && !result.isCorrect && hintOpen && feedbackHint ? <p className={`${styles.inlineHint} lesson-exercise-inline-hint`} role="status"><strong>{hintInlineLabel}</strong> {feedbackHint}</p> : null}
    <div className={`${styles.answerList} lesson-exercise-answer-list mt-4 space-y-2`}>
      {choice && choiceOptions.map((option) => { const selected = multiple ? (answer as string[]).includes(option) : answer === option; return <label key={option} className={`${styles.choice} lesson-exercise-choice flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus-within:ring-2 focus-within:ring-blue-500`}><input type={multiple ? "checkbox" : "radio"} name={exercise.id} checked={selected} disabled={inputsLocked} onChange={() => { const next = multiple ? (selected ? (answer as string[]).filter((item) => item !== option) : [...answer as string[], option]) : option; changeAnswer(next); }} onKeyDown={(event) => submitChoiceOnEnter(event, option)} aria-keyshortcuts="Enter" /><span>{option}</span></label>; })}
      {matching && compactToBeMatching && matchingLeft.map((leftItem) => {
        const current = String((answer as JsonObject)[leftItem] ?? "");
        const answerLabel = locale === "uk" ? "Впишіть слово" : locale === "ru" ? "Впишите слово" : "Type the word";
        const placeholder = locale === "uk" ? "am, is або are" : locale === "ru" ? "am, is или are" : "am, is, or are";
        return <label key={leftItem} className="lesson-exercise-text-answer block"><span className="lesson-exercise-question mb-2 block text-slate-800">{leftItem}</span><span className="lesson-exercise-answer-label">{answerLabel}</span><input disabled={inputsLocked} value={current} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [leftItem]: event.target.value })} onKeyDown={(event) => submitCompactMatchingOnEnter(event, leftItem)} aria-keyshortcuts="Enter" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60" placeholder={placeholder} autoComplete="off" /></label>;
      })}
      {matching && !compactToBeMatching && matchingLeft.map((leftItem) => {
        const storedValue = String((answer as JsonObject)[leftItem] ?? "");
        return <label key={leftItem} className="lesson-exercise-match-row grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{leftItem}</span><select disabled={inputsLocked} className="lesson-exercise-select rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" value={storedValue} onChange={(event) => {
          const next = { ...(answer as JsonObject), [leftItem]: event.target.value };
          changeAnswer(next);
        }} onKeyDown={(event) => submitAssignedSelectOnEnter(event, leftItem, true)} aria-keyshortcuts="Enter"><option value="">Choose a match</option>{matchingOptions.map((rightItem, optionIndex) => <option key={`${rightItem}-${optionIndex}`} value={rightItem}>{rightItem}</option>)}</select></label>;
      })}
      {ordered ? <><div className="lesson-exercise-token-bank flex flex-wrap gap-2" aria-label="Available tokens">{orderedOptions.map((option, index) => { const selected = (answer as string[]).includes(option); return <button key={`${option}-${index}`} type="button" disabled={inputsLocked || selected} onClick={() => changeAnswer([...answer as string[], option])} onKeyDown={(event) => submitOrderedTokenOnEnter(event, option)} aria-keyshortcuts="Enter" className="lesson-exercise-token rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{displaySentenceBuilderToken(option)}</button>; })}</div><ul className="lesson-exercise-token-answer list-none flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-700" aria-label="Selected order">{(answer as string[]).map((token, index) => <li key={`${token}-${index}`}><button type="button" disabled={inputsLocked} onClick={() => changeAnswer((answer as string[]).filter((_, tokenIndex) => tokenIndex !== index))} className="lesson-exercise-token-selected rounded bg-blue-50 px-2 py-1 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Remove ${token}`}>{displaySentenceBuilderToken(token)}</button></li>)}</ul><button type="button" disabled={inputsLocked} onClick={() => changeAnswer([])} className="lesson-exercise-reset text-sm font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50">Reset order</button></> : null}
      {classification && classificationItems.map((item) => <label key={item} className="lesson-exercise-match-row grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select disabled={inputsLocked} className="lesson-exercise-select rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" value={String((answer as JsonObject)[item] ?? "")} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [item]: event.target.value })} onKeyDown={(event) => submitAssignedSelectOnEnter(event, item, false)} aria-keyshortcuts="Enter"><option value="">Choose a category</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>)}
      {!choice && !matching && !ordered && !classification ? <label className={`${styles.textAnswer} lesson-exercise-text-answer block`}><span className={`${styles.answerLabel} lesson-exercise-answer-label`}>{textAnswerLabel}</span>{longText ? <textarea disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} onKeyDown={submitLongTextAnswerOnEnter} aria-keyshortcuts="Enter" rows={5} className={`${styles.textInput} w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60`} placeholder={renderer === "recording" ? "Write a transcript or response for review" : textAnswerPlaceholder} /> : <input disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} onKeyDown={submitSingleLineAnswerOnEnter} aria-keyshortcuts="Enter" className={`${styles.textInput} w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60`} placeholder={textAnswerPlaceholder} />}</label> : null}
    </div>
    {!result ? <div className={styles.submitRow}><button type="button" onClick={() => void checkAnswer(matching ? compactMatchingSubmission(answer as JsonObject) : answer)} disabled={inputsLocked || !hasCompleteAnswer} className={`${styles.nextButton} lesson-exercise-action lesson-exercise-action-primary inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}>{sending ? "Checking…" : "Next →"}</button></div> : null}
    {sending ? <p className="mt-4 text-sm font-medium text-blue-700" role="status">Checking…</p> : null}
    {!result && (authoredTranslation || translationSource) ? <div className={styles.supportActions}><button type="button" onClick={() => void toggleTranslation()} disabled={translationSending} aria-expanded={Boolean(translation)} className={`${styles.translationButton} lesson-exercise-translation-trigger`}>{translationSending ? translationOpeningLabel : translation ? translationHideLabel : `${translationShowLabel} · ${translationPriceLabel}`}</button></div> : null}
    {translationError ? <p className="mt-2 text-sm text-amber-700" role="status">{translationError}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {result && !result.isCorrect ? <section className="lesson-exercise-result lesson-exercise-result-error"><div className="lesson-exercise-result-copy"><strong className="lesson-exercise-result-title">{incorrectCopy.title}</strong><p className="lesson-exercise-result-meta">{incorrectCopy.description}</p></div><div className="lesson-exercise-result-actions">{onDefer ? <button type="button" onClick={() => onDefer(exercise.id)} className="lesson-exercise-action lesson-exercise-action-later" aria-label="Continue later and keep this task in your mistakes">{solutionCopy.later}</button> : null}{result.solution?.available && !solution ? (confirmSolution ? <div className="lesson-exercise-solution-confirm"><span>{result.solution.opened ? solutionCopy.saved : solutionCopy.confirm.replace("{cost}", String(result.solution.cost))}</span><button type="button" onClick={openSolution} disabled={solutionSending} className="lesson-exercise-action lesson-exercise-action-primary">{solutionSending ? solutionCopy.opening : solutionCopy.show}</button><button type="button" onClick={() => setConfirmSolution(false)} className="lesson-exercise-action lesson-exercise-action-quiet">{solutionCopy.cancel}</button></div> : <button type="button" onClick={() => setConfirmSolution(true)} className="lesson-exercise-action lesson-exercise-action-solution">{result.solution.opened ? solutionCopy.show : `${solutionCopy.show} · ${result.solution.cost} XP`}</button>) : null}</div></section> : null}
    {visibleFeedback ? <section className={`lesson-exercise-feedback ${solution ? "lesson-exercise-feedback-solution" : ""}`}>{solution ? <p className="lesson-exercise-feedback-label">{incorrectCopy.solution}</p> : null}{visibleFeedback.correctAnswer !== null && !result?.isCorrect && !explanationAlreadyStatesAnswer(visibleFeedback.explanation, visibleFeedback.correctAnswer) ? <div className="lesson-exercise-answer-reveal"><span>{answerFeedback.correctAnswer}</span><AnswerReveal answer={visibleFeedback.correctAnswer} /></div> : null}{visibleFeedback.explanation ? <div className="lesson-exercise-explanation"><strong>{explanationLabel}</strong><p>{visibleFeedback.explanation}</p></div> : null}{visibleFeedback.feedback?.example ? <p className="lesson-exercise-feedback-example">{solutionCopy.example} {visibleFeedback.feedback.example}</p> : null}{visibleFeedback.feedback?.theoryHref ? <Link href={visibleFeedback.feedback.theoryHref} className="lesson-exercise-feedback-rule">{solutionCopy.reviewRule}</Link> : null}{visibleFeedback.feedback?.errorDetails.length ? <details className="lesson-exercise-feedback-details"><summary>{solutionCopy.allErrors}</summary><ul>{visibleFeedback.feedback.errorDetails.map((detail, index) => <li key={`${detail.incorrect}-${index}`}><s>{detail.incorrect}</s> → <strong>{detail.correction}</strong>{detail.explanation ? ` — ${detail.explanation}` : ""}</li>)}</ul></details> : null}</section> : null}
    {result && !result.isCorrect ? <button type="button" onClick={restartExercise} className="lesson-exercise-retry-button">{retryLabel}</button> : null}
    {result?.isCorrect && exercise.allowExtraExercise && !extraExercise ? <button type="button" onClick={loadExtraPractice} disabled={extraSending} className="mt-3 text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60">{extraSending ? "Preparing extra practice…" : "Try another exercise in this lesson"}</button> : null}
    {extraExercise ? <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="mb-3 text-base font-bold text-slate-900">Extra practice</h3><ExerciseRenderer exercise={extraExercise} /></div> : null}
  </section>;
}
