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
import { experienceForExerciseSpeed, exerciseSpeedWindowSeconds, remainingExerciseSpeedPercent } from "@/modules/courses/utils/exercise-speed-reward";
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
  grammarSkillProgress?: Array<{ status: "LEARNING" | "REVIEW_DUE" | "MASTERED"; consecutiveErrors: number }>;
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
type TranslationResult = { translation: string; alreadyPurchased: boolean; cost: number; balance: number; bonusUsed?: boolean; remainingCredits?: number };
type HintPurchaseResult = { alreadyPurchased: boolean; cost: number; balance: number; bonusUsed?: boolean; remainingCredits?: number; freeFallback?: boolean };
type SpeedWindowResult = { id: string; openedAt: string; windowSeconds: number };

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

type DynamicToBeMatchingPair = { id: string; left: string; right: "am" | "is" | "are" };

/** Reads the server-authored dynamic To Be matcher without trusting arbitrary
 * client configuration. The answer itself remains validated by the API. */
function dynamicToBeMatchingPairs(content: JsonObject): DynamicToBeMatchingPair[] {
  if (content.dynamicMatching !== true || !Array.isArray(content.pairs)) return [];
  const seen = new Set<string>();
  const pairs: DynamicToBeMatchingPair[] = [];
  for (const item of content.pairs) {
    const candidate = asObject(item);
    const id = typeof candidate.id === "string" ? candidate.id : "";
    const left = typeof candidate.left === "string" ? candidate.left : "";
    const right = typeof candidate.right === "string" ? candidate.right.toLowerCase() : "";
    if (!/^[a-z0-9-]+$/i.test(id) || !left || (right !== "am" && right !== "is" && right !== "are") || seen.has(id)) return [];
    seen.add(id);
    pairs.push({ id, left, right });
  }
  return pairs;
}

function displayTranslation(value: string) {
  return value.trim().replace(/^(?:translation|перевод|переклад)\s*:\s*/iu, "");
}

function explanationAlreadyStatesAnswer(explanation: string | null | undefined, answer: unknown) {
  if (!explanation?.trim()) return false;
  const visibleAnswer = displayAnswer(answer).trim().toLocaleLowerCase();
  return visibleAnswer.length > 0 && explanation.toLocaleLowerCase().includes(visibleAnswer);
}

/**
 * Error-correction cards have appeared in several authoring formats. Prefer
 * their actual incorrect sentence to a generic label such as “Correct:”. The
 * last fallback keeps older cards usable when only structured error details
 * were stored.
 */
function correctionPrompt(question: string, content: JsonObject) {
  const sourceSentence = content.sourceSentence;
  if (typeof sourceSentence === "string" && sourceSentence.trim()) return sourceSentence.trim();

  const questionText = question.trim();
  const genericQuestion = /^(?:виправте|исправьте|correct|fix)(?:\s+(?:речення|sentence|форму|the\s+sentence))?\s*:?$/iu.test(questionText);
  if (!genericQuestion) return questionText;

  const errorDetails = content.errorDetails;
  if (Array.isArray(errorDetails)) {
    const incorrect = errorDetails
      .map((detail) => asObject(detail).incorrect)
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (incorrect) return incorrect.trim();
  }
  return questionText;
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
  const dynamicToBePairs = useMemo(() => dynamicToBeMatchingPairs(content), [content]);
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
  const dynamicToBeMatching = matching && dynamicToBePairs.length > 0;
  const ordered = renderer === "ordering" || renderer === "word-bank";
  const classification = renderer === "classification";
  const longText = renderer === "long-text" || renderer === "recording" || renderer === "media";
  const correctedWordOnly = exercise.engineKey === "find-and-correct" && content.answerMode === "CORRECTED_TOKEN";
  const initialAnswer = useMemo<ExerciseAnswer>(() => multiple || ordered ? [] : matching || classification ? {} : "", [classification, matching, multiple, ordered]);
  const [answer, setAnswer] = useState<ExerciseAnswer>(initialAnswer);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [extraExercise, setExtraExercise] = useState<LessonExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [extraSending, setExtraSending] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSending, setTranslationSending] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const [speedWindowId, setSpeedWindowId] = useState<string | null>(null);
  const [speedWindowStartedAt, setSpeedWindowStartedAt] = useState(() => Date.now());
  const [speedWindowSeconds, setSpeedWindowSeconds] = useState(() => exerciseSpeedWindowSeconds(exercise.timeLimitSeconds));
  const [speedWindowRun, setSpeedWindowRun] = useState(0);
  const [speedClock, setSpeedClock] = useState(() => Date.now());
  const [dynamicCompletedPairIds, setDynamicCompletedPairIds] = useState<string[]>([]);
  const [dynamicPairsReady, setDynamicPairsReady] = useState(!dynamicToBeMatching);
  const [dynamicUsesServer, setDynamicUsesServer] = useState(false);
  const [dynamicSelectedLeftId, setDynamicSelectedLeftId] = useState<string | null>(null);
  const [dynamicWrongSelection, setDynamicWrongSelection] = useState<{ leftId: string; rightTokenId: string } | null>(null);
  const [dynamicSending, setDynamicSending] = useState(false);
  const [dynamicXpFlash, setDynamicXpFlash] = useState(0);
  const submissionInFlightRef = useRef(false);
  const translationRequestRef = useRef(0);
  const dynamicFinalizingRef = useRef(false);
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
  const dynamicPairById = useMemo(() => new Map(dynamicToBePairs.map((pair) => [pair.id, pair])), [dynamicToBePairs]);
  const dynamicPairOrder = useMemo(() => {
    const orderedIds = shuffleTokens(dynamicToBePairs.map((pair) => pair.id), `${exercise.id}:dynamic-to-be-pairs`, []);
    return orderedIds.map((id) => dynamicPairById.get(id)).filter((pair): pair is DynamicToBeMatchingPair => Boolean(pair));
  }, [dynamicPairById, dynamicToBePairs, exercise.id]);
  const dynamicCompletedSet = useMemo(() => new Set(dynamicCompletedPairIds), [dynamicCompletedPairIds]);
  const dynamicActivePairs = useMemo(
    () => dynamicPairOrder.filter((pair) => !dynamicCompletedSet.has(pair.id)).slice(0, 3),
    [dynamicCompletedSet, dynamicPairOrder],
  );
  const dynamicLeftPairs = useMemo(() => {
    const orderedIds = shuffleTokens(dynamicActivePairs.map((pair) => pair.id), `${exercise.id}:${dynamicCompletedPairIds.join(",")}:dynamic-left`, []);
    return orderedIds.map((id) => dynamicPairById.get(id)).filter((pair): pair is DynamicToBeMatchingPair => Boolean(pair));
  }, [dynamicActivePairs, dynamicCompletedPairIds, dynamicPairById, exercise.id]);
  const dynamicRightTokens = useMemo(() => {
    const tokens = dynamicActivePairs.map((pair, index) => ({ id: `${pair.id}:${index}`, form: pair.right }));
    const order = shuffleTokens(tokens.map((token) => token.id), `${exercise.id}:${dynamicCompletedPairIds.join(",")}:dynamic-right`, []);
    return order.map((id) => tokens.find((token) => token.id === id)).filter((token): token is { id: string; form: "am" | "is" | "are" } => Boolean(token));
  }, [dynamicActivePairs, dynamicCompletedPairIds, exercise.id]);
  const dynamicFinalAnswer = useMemo<JsonObject>(
    () => Object.fromEntries(dynamicToBePairs.map((pair) => [pair.id, pair.right])),
    [dynamicToBePairs],
  );
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
  const grammarReviewDue = Boolean(result && !result.isCorrect && result.grammarSkillProgress?.some((progress) => progress.status === "REVIEW_DUE" && progress.consecutiveErrors >= 2));

  useEffect(() => { if (error) toast.error(error); }, [error]);
  useEffect(() => { if (translationError) toast.error(translationError); }, [translationError]);
  useEffect(() => {
    const controller = new AbortController();
    setDynamicCompletedPairIds([]);
    setDynamicSelectedLeftId(null);
    setDynamicWrongSelection(null);
    setDynamicXpFlash(0);
    setDynamicUsesServer(false);
    setDynamicPairsReady(!dynamicToBeMatching);
    dynamicFinalizingRef.current = false;
    if (!dynamicToBeMatching || previewMode) {
      setDynamicPairsReady(true);
      return () => controller.abort();
    }
    void (async () => {
      try {
        const response = await fetch(`/api/learning/exercises/${exercise.id}/matching-pairs`, { signal: controller.signal, cache: "no-store" });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          // Guest lessons keep their local interaction; final card validation
          // still uses the existing public attempt route and grants no XP.
          setDynamicPairsReady(true);
          return;
        }
        const payload = await response.json().catch(() => null) as { data?: { completedPairIds?: unknown } } | null;
        if (!response.ok || !payload?.data || !Array.isArray(payload.data.completedPairIds)) throw new Error("Unable to load matching progress.");
        const allowedIds = new Set(dynamicToBePairs.map((pair) => pair.id));
        setDynamicCompletedPairIds(payload.data.completedPairIds.filter((pairId): pairId is string => typeof pairId === "string" && allowedIds.has(pairId)));
        setDynamicUsesServer(true);
        setDynamicPairsReady(true);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load matching progress.");
      }
    })();
    return () => controller.abort();
  }, [dynamicToBeMatching, dynamicToBePairs, exercise.id, previewMode]);
  useEffect(() => {
    const controller = new AbortController();
    const localStartedAt = Date.now();
    const defaultWindowSeconds = exerciseSpeedWindowSeconds(exercise.timeLimitSeconds);
    setSpeedWindowId(null);
    setSpeedWindowStartedAt(localStartedAt);
    setSpeedWindowSeconds(defaultWindowSeconds);
    setSpeedClock(localStartedAt);
    setAttemptStartedAt(localStartedAt);

    if (previewMode) return () => controller.abort();
    void (async () => {
      try {
        const response = await fetch(`/api/learning/exercises/${exercise.id}/speed-window`, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as { data?: SpeedWindowResult } | null;
        if (!response.ok || !payload?.data || controller.signal.aborted) return;
        const openedAt = Date.parse(payload.data.openedAt);
        const serverStartedAt = Number.isFinite(openedAt) ? openedAt : Date.now();
        setSpeedWindowId(payload.data.id);
        setSpeedWindowStartedAt(serverStartedAt);
        setSpeedWindowSeconds(exerciseSpeedWindowSeconds(payload.data.windowSeconds));
        setAttemptStartedAt(serverStartedAt);
        setSpeedClock(Date.now());
      } catch {
        // Guest cards stay usable and signed-in learners still receive the
        // safe 1 XP fallback if a timer request is interrupted.
      }
    })();
    return () => controller.abort();
  }, [exercise.id, exercise.timeLimitSeconds, previewMode, speedWindowRun]);
  useEffect(() => {
    if (result) return;
    const interval = window.setInterval(() => setSpeedClock(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [result]);

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
    setAnswer(next); setResult(null);
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
    setError(null);
    setHintOpen(false);
    setHintUsed(false);
    setTranslation(null);
    setTranslationError(null);
    setTranslationSending(false);
    setAttemptStartedAt(Date.now());
    setSpeedWindowRun((run) => run + 1);
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
      if (isCorrect) setHintOpen(false);
      else clearTranslation();
      onAttemptResolved?.({ exerciseId: exercise.id, isCorrect });
      setSending(false);
      submissionInFlightRef.current = false;
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json", ...(contentLocale ? { "x-krin-content-locale": contentLocale } : {}) }, body: JSON.stringify({ answer: answerToCheck, idempotencyKey, hintUsed, timeSpentSeconds: Math.max(0, Math.round((Date.now() - attemptStartedAt) / 1000)), ...(speedWindowId ? { speedWindowId } : {}), ...(reviewRunId ? { reviewRunId } : {}) }) });
      const payload = await response.json() as { data?: AttemptResult; error?: string };
      if (!response.ok || !payload.data) { setError(payload.error ?? "Unable to check the answer. Please sign in and try again."); return; }
      setResult(payload.data);
      if (payload.data.isCorrect) setHintOpen(false);
      else clearTranslation();
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

  function markDynamicPairComplete(pairId: string, completedIds: string[], awardedExperience: number) {
    const allowedIds = new Set(dynamicToBePairs.map((pair) => pair.id));
    const nextIds = [...new Set([...completedIds, pairId])].filter((id) => allowedIds.has(id));
    setDynamicCompletedPairIds(nextIds);
    setDynamicSelectedLeftId(null);
    setDynamicWrongSelection(null);
    if (awardedExperience > 0) {
      setDynamicXpFlash(awardedExperience);
      window.setTimeout(() => setDynamicXpFlash(0), 950);
      notifyMotivationUpdated();
    }
    // The final validation is deliberately submitted only after the 36th
    // verified match. It is what unlocks the lesson's regular Next flow.
    if (nextIds.length === dynamicToBePairs.length && !dynamicFinalizingRef.current) {
      dynamicFinalizingRef.current = true;
      void checkAnswer(dynamicFinalAnswer);
    }
  }

  function showDynamicWrong(leftId: string, rightTokenId: string) {
    setDynamicWrongSelection({ leftId, rightTokenId });
    setDynamicSelectedLeftId(null);
    window.setTimeout(() => setDynamicWrongSelection(null), 650);
  }

  async function selectDynamicRight(rightToken: { id: string; form: "am" | "is" | "are" }) {
    const selectedPair = dynamicSelectedLeftId ? dynamicPairById.get(dynamicSelectedLeftId) : null;
    if (!selectedPair || dynamicSending || result) return;
    if (selectedPair.right !== rightToken.form) {
      showDynamicWrong(selectedPair.id, rightToken.id);
      return;
    }

    if (!dynamicUsesServer || previewMode) {
      markDynamicPairComplete(selectedPair.id, dynamicCompletedPairIds, 0);
      return;
    }

    setDynamicSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/exercises/${exercise.id}/matching-pairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: selectedPair.id, selectedForm: rightToken.form }),
      });
      if (response.status === 401) {
        // An expired session should not make the visual matcher unusable. The
        // final public validation remains available, but no local XP is shown.
        setDynamicUsesServer(false);
        markDynamicPairComplete(selectedPair.id, dynamicCompletedPairIds, 0);
        return;
      }
      const payload = await response.json().catch(() => null) as {
        data?: { isCorrect?: boolean; completedPairIds?: unknown; motivationReward?: { awarded?: boolean; experience?: number } };
        error?: string;
      } | null;
      if (!response.ok || !payload?.data || !Array.isArray(payload.data.completedPairIds)) throw new Error(payload?.error ?? "Unable to check this match.");
      if (!payload.data.isCorrect) {
        showDynamicWrong(selectedPair.id, rightToken.id);
        return;
      }
      const completedIds = payload.data.completedPairIds.filter((pairId): pairId is string => typeof pairId === "string");
      markDynamicPairComplete(
        selectedPair.id,
        completedIds,
        payload.data.motivationReward?.awarded ? Math.max(0, payload.data.motivationReward.experience ?? 0) : 0,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check this match.");
    } finally {
      setDynamicSending(false);
    }
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
        // Hints are always learner-initiated. An incorrect answer must never
        // silently spend XP or a yellow credit on the learner's behalf.
        body: JSON.stringify({ automatic: false }),
      });
      const payload = await response.json().catch(() => null) as { data?: HintPurchaseResult; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to show the hint.");
      setHintOpen(true);
      setHintUsed(!payload.data.freeFallback);
      if (payload.data.cost > 0 || payload.data.bonusUsed) notifyMotivationUpdated();
      if (payload.data.bonusUsed && !payload.data.alreadyPurchased) toast.success(locale === "uk" ? "Використано жовтий бонус підказки" : locale === "ru" ? "Использован жёлтый бонус подсказки" : "Hint credit used");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to show the hint. Please try again.");
    }
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
  // A wrong answer must immediately teach the learner something. Keeping the
  // correction behind an XP purchase made the error state both frustrating
  // and impossible to understand for learners with a zero balance.
  const visibleFeedback = result;
  const visibleInstruction = compactToBeMatching
    ? locale === "uk"
      ? "Впишіть правильну форму: am, is або are."
      : locale === "ru"
        ? "Впишите правильную форму: am, is или are."
        : "Type the correct form: am, is, or are."
    : exercise.instruction;
  const visibleQuestion = (exercise.engineKey === "find-and-correct"
    ? correctionPrompt(exercise.question, content)
    : exercise.question
  ).replace(/^(?:[\p{L}]+\s+)?(?:пример|приклад):\s*/iu, "");
  const answerFeedback = learnerAnswerFeedback(locale);
  const hintInlineLabel = locale === "uk" ? "Підказка:" : locale === "ru" ? "Подсказка:" : "Hint:";
  const translationOpeningLabel = locale === "uk" ? "Готуємо…" : locale === "ru" ? "Готовим…" : "Preparing…";
  const translationLabel = locale === "uk" ? "Переклад" : locale === "ru" ? "Перевод" : "Translation";
  const retryLabel = locale === "uk" ? "Спробувати ще раз" : locale === "ru" ? "Попробовать ещё раз" : "Try again";
  const textAnswerLabel = correctedWordOnly
    ? locale === "uk" ? "Правильне слово" : locale === "ru" ? "Правильное слово" : "Correct word"
    : locale === "uk" ? "Ваша відповідь" : locale === "ru" ? "Ваш ответ" : "Your answer";
  const textAnswerPlaceholder = correctedWordOnly
    ? locale === "uk" ? "Впишіть лише правильне слово" : locale === "ru" ? "Введите только правильное слово" : "Type only the corrected word"
    : locale === "uk" ? "Впишіть свою відповідь" : locale === "ru" ? "Введите свой ответ" : "Type your answer";
  const sentenceBuilderCopy = locale === "uk"
    ? { bank: "Слова для речення", answer: "Ваше речення", empty: "Натисніть на слова вище, щоб скласти речення.", reset: "Очистити" }
    : locale === "ru"
      ? { bank: "Слова для предложения", answer: "Ваше предложение", empty: "Нажмите на слова выше, чтобы собрать предложение.", reset: "Очистить" }
      : { bank: "Words to use", answer: "Your sentence", empty: "Choose the words above to build the sentence.", reset: "Clear" };
  const solutionCopy = locale === "uk"
    ? { show: "Показати розв’язання", saved: "Показати збережене розв’язання?", confirm: "Показати розв’язання за {cost} XP?", opening: "Відкриваємо…", cancel: "Скасувати", later: "Відкласти", example: "Приклад:", reviewRule: "Повторити правило", allErrors: "Показати всі помилки" }
    : locale === "ru"
      ? { show: "Показать решение", saved: "Показать сохранённое решение?", confirm: "Показать решение за {cost} XP?", opening: "Открываем…", cancel: "Отмена", later: "Отложить", example: "Пример:", reviewRule: "Повторить правило", allErrors: "Показать все ошибки" }
      : { show: "Show solution", saved: "Show the saved solution?", confirm: "Show solution for {cost} XP?", opening: "Opening…", cancel: "Cancel", later: "Review later", example: "Example:", reviewRule: "Review the rule", allErrors: "Show all errors" };
  const incorrectCopy = locale === "uk"
    ? { title: "Ще трохи практики", description: "Перегляньте правильний варіант нижче й спробуйте ще раз або відкладіть завдання до повторення.", solution: "Розв’язання" }
    : locale === "ru"
      ? { title: "Нужно ещё немного практики", description: "Посмотрите правильный вариант ниже и попробуйте ещё раз или отложите задание на повторение.", solution: "Решение" }
      : { title: "A little more practice", description: "Review the correct answer below, then try again or save this task for review.", solution: "Solution" };
  const explanationLabel = locale === "uk" ? "Чому так" : locale === "ru" ? "Почему так" : "Why it works";
  const feedbackHint = visibleHint ?? result?.hint ?? exercise.hint;
  const streak = result?.motivationReward?.streak ?? null;
  const streakTone = streak?.tone && /^[a-z-]+$/.test(streak.tone) ? streak.tone : null;
  const activeStreakTone = result?.isCorrect ? streakTone : result ? null : persistentStreakTone;
  const activeStreakClass = activeStreakTone && /^[a-z-]+$/.test(activeStreakTone) ? ` lesson-exercise-streak-${activeStreakTone}` : "";
  const streakActivated = Boolean(result?.motivationReward?.awarded && streak?.activated && streakTone);
  const speedElapsedSeconds = Math.max(0, (speedClock - speedWindowStartedAt) / 1000);
  const speedExperience = experienceForExerciseSpeed(speedElapsedSeconds, speedWindowSeconds);
  const speedRemainingPercent = remainingExerciseSpeedPercent(speedElapsedSeconds, speedWindowSeconds);
  const speedCopy = locale === "uk"
    ? { label: "Нагорода за швидкість", bar: "Час на відповідь" }
    : locale === "ru"
      ? { label: "Награда за скорость", bar: "Время на ответ" }
      : { label: "Speed reward", bar: "Answer time" };
  const dynamicMatchingCopy = locale === "uk"
    ? { left: "Займенники", right: "Форми to be", progress: "Збігів", loading: "Відновлюємо збіги…", completing: "Завершуємо картку…" }
    : locale === "ru"
      ? { left: "Местоимения", right: "Формы to be", progress: "Совпадений", loading: "Восстанавливаем совпадения…", completing: "Завершаем карточку…" }
      : { left: "Pronouns", right: "To be forms", progress: "Matches", loading: "Restoring matches…", completing: "Completing card…" };

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
    {!result && !dynamicToBeMatching ? <div className={styles.speedReward} aria-label={`${speedCopy.bar}: +${speedExperience} XP`}>
      <div className={styles.speedRewardHeader}><span>{speedCopy.label}</span><strong>+{speedExperience} XP</strong></div>
      <div className={styles.speedTrack} aria-hidden="true"><span className={styles.speedFill} style={{ width: `${speedRemainingPercent}%` }} /></div>
    </div> : null}
    {passage ? <article className="lesson-exercise-passage mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800" aria-label="Reading passage">{passage}</article> : null}
    {audio ? <audio className="mt-3 w-full" controls preload="metadata" src={audio}>Your browser does not support audio playback.</audio> : null}
    {video ? <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={video}>Your browser does not support video playback.</video> : null}
    {!compactToBeMatching && !dynamicToBeMatching ? <div className={`${styles.questionRow} lesson-exercise-question-row`}><p className={`${styles.question} lesson-exercise-question text-slate-700`}>{visibleQuestion}</p>{translation ? <div className="lesson-exercise-translation-result" role="status">{translation}</div> : null}</div> : null}
    {compactToBeMatching && translation ? <div className="lesson-exercise-translation-result mt-3" role="status">{translation}</div> : null}
    {hintOpen && !result?.isCorrect && feedbackHint ? <p className={`${styles.inlineHint} lesson-exercise-inline-hint`} role="status"><strong>{hintInlineLabel}</strong> {feedbackHint}</p> : null}
    <div className={`${styles.answerList} lesson-exercise-answer-list mt-4 space-y-2`}>
      {dynamicToBeMatching ? <section className={styles.dynamicMatching} aria-label={visibleInstruction}>
        <header className={styles.dynamicMatchingHeader}>
          <span>{dynamicMatchingCopy.progress}</span>
          <strong>{dynamicCompletedPairIds.length} / {dynamicToBePairs.length}</strong>
          {dynamicXpFlash > 0 ? <em className={styles.dynamicXpFlash} role="status">+{dynamicXpFlash} XP</em> : null}
        </header>
        {!dynamicPairsReady ? <p className={styles.dynamicMatchingStatus} role="status">{dynamicMatchingCopy.loading}</p> : null}
        {dynamicPairsReady ? <div className={styles.dynamicMatchingGrid}>
          <section className={styles.dynamicMatchingColumn} aria-label={dynamicMatchingCopy.left}>
            <h3>{dynamicMatchingCopy.left}</h3>
            <div className={styles.dynamicMatchingTokens}>
              {dynamicLeftPairs.map((pair) => <button
                key={pair.id}
                type="button"
                disabled={dynamicSending || Boolean(result)}
                aria-pressed={dynamicSelectedLeftId === pair.id}
                onClick={() => { setDynamicSelectedLeftId(pair.id); setDynamicWrongSelection(null); }}
                className={`${styles.dynamicMatchingToken} ${dynamicSelectedLeftId === pair.id ? styles.dynamicMatchingTokenSelected : ""} ${dynamicWrongSelection?.leftId === pair.id ? styles.dynamicMatchingTokenWrong : ""}`}
              >{pair.left}</button>)}
            </div>
          </section>
          <section className={styles.dynamicMatchingColumn} aria-label={dynamicMatchingCopy.right}>
            <h3>{dynamicMatchingCopy.right}</h3>
            <div className={styles.dynamicMatchingTokens}>
              {dynamicRightTokens.map((token) => <button
                key={token.id}
                type="button"
                disabled={dynamicSending || !dynamicSelectedLeftId || Boolean(result)}
                onClick={() => void selectDynamicRight(token)}
                className={`${styles.dynamicMatchingToken} ${styles.dynamicMatchingFormToken} ${dynamicWrongSelection?.rightTokenId === token.id ? styles.dynamicMatchingTokenWrong : ""}`}
              >{token.form}</button>)}
            </div>
          </section>
        </div> : null}
        {dynamicPairsReady && dynamicCompletedPairIds.length === dynamicToBePairs.length && !result ? <p className={styles.dynamicMatchingStatus} role="status">{dynamicMatchingCopy.completing}</p> : null}
      </section> : null}
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
      {ordered ? <section className={styles.sentenceBuilder} aria-label={sentenceBuilderCopy.answer}>
        <div className={`${styles.tokenBank} lesson-exercise-token-bank`} aria-label="Available tokens">
          <p className={styles.tokenSectionLabel}>{sentenceBuilderCopy.bank}</p>
          <div className={styles.tokenGrid}>{orderedOptions.map((option, index) => {
            const selected = (answer as string[]).includes(option);
            return <button
              key={`${option}-${index}`}
              type="button"
              disabled={inputsLocked || selected}
              onClick={() => changeAnswer([...answer as string[], option])}
              onKeyDown={(event) => submitOrderedTokenOnEnter(event, option)}
              aria-keyshortcuts="Enter"
              className={`${styles.token} lesson-exercise-token`}
            >{displaySentenceBuilderToken(option)}</button>;
          })}</div>
        </div>
        <div className={`${styles.tokenAnswer} lesson-exercise-token-answer`} aria-label="Selected order">
          <p className={styles.tokenSectionLabel}>{sentenceBuilderCopy.answer}</p>
          {(answer as string[]).length ? <ul className={styles.tokenAnswerList}>{(answer as string[]).map((token, index) => <li key={`${token}-${index}`} className={styles.tokenAnswerItem}>
            <button
              type="button"
              disabled={inputsLocked}
              onClick={() => changeAnswer((answer as string[]).filter((_, tokenIndex) => tokenIndex !== index))}
              className={`${styles.tokenSelected} lesson-exercise-token-selected`}
              aria-label={`Remove ${token}`}
            >{displaySentenceBuilderToken(token)}</button>
          </li>)}</ul> : <p className={styles.tokenAnswerEmpty}>{sentenceBuilderCopy.empty}</p>}
        </div>
        <button type="button" disabled={inputsLocked || !(answer as string[]).length} onClick={() => changeAnswer([])} className={`${styles.tokenReset} lesson-exercise-reset`}>{sentenceBuilderCopy.reset}</button>
      </section> : null}
      {classification && classificationItems.map((item) => <label key={item} className="lesson-exercise-match-row grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select disabled={inputsLocked} className="lesson-exercise-select rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" value={String((answer as JsonObject)[item] ?? "")} onChange={(event) => changeAnswer({ ...(answer as JsonObject), [item]: event.target.value })} onKeyDown={(event) => submitAssignedSelectOnEnter(event, item, false)} aria-keyshortcuts="Enter"><option value="">Choose a category</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>)}
      {!choice && !matching && !ordered && !classification ? <label className={`${styles.textAnswer} lesson-exercise-text-answer block`}>{correctedWordOnly ? <span className={`${styles.answerLabel} lesson-exercise-answer-label`}>{textAnswerLabel}</span> : null}{longText ? <textarea disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} onKeyDown={submitLongTextAnswerOnEnter} aria-label={textAnswerLabel} aria-keyshortcuts="Enter" rows={5} className={`${styles.textInput} w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60`} placeholder={renderer === "recording" ? "Write a transcript or response for review" : textAnswerPlaceholder} /> : <input disabled={inputsLocked} value={typeof answer === "string" ? answer : ""} onChange={(event) => changeAnswer(event.target.value)} onKeyDown={submitSingleLineAnswerOnEnter} aria-label={textAnswerLabel} aria-keyshortcuts="Enter" className={`${styles.textInput} w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60`} placeholder={textAnswerPlaceholder} />}</label> : null}
    </div>
    {!result && !dynamicToBeMatching ? <div className={`${styles.actionRow} ${(authoredTranslation || translationSource || (exercise.hintsEnabled && visibleHint)) ? styles.actionRowWithTranslation : ""}`}>
      {exercise.hintsEnabled && visibleHint ? <button type="button" onClick={() => void revealHint()} disabled={hintOpen} aria-expanded={hintOpen} className="lesson-exercise-hint-control">{hintInlineLabel.replace(/:$/, "")}</button> : null}
      {(authoredTranslation || translationSource) ? <button type="button" onClick={() => void toggleTranslation()} disabled={translationSending} aria-expanded={Boolean(translation)} className={`${styles.translationButton} lesson-exercise-translation-trigger`}>{translationSending ? translationOpeningLabel : translationLabel}</button> : null}
      <button type="button" onClick={() => void checkAnswer(matching ? compactMatchingSubmission(answer as JsonObject) : answer)} disabled={inputsLocked || !hasCompleteAnswer} className={`${styles.nextButton} lesson-exercise-action lesson-exercise-action-primary inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}>{sending ? "Checking…" : "Next →"}</button>
    </div> : null}
    {sending ? <p className="mt-4 text-sm font-medium text-blue-700" role="status">Checking…</p> : null}
    {translationError ? <p className="mt-2 text-sm text-amber-700" role="status">{translationError}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {result && !result.isCorrect ? <section className="lesson-exercise-result lesson-exercise-result-error"><div className="lesson-exercise-result-copy"><strong className="lesson-exercise-result-title">{incorrectCopy.title}</strong><p className="lesson-exercise-result-meta">{incorrectCopy.description}</p></div><div className="lesson-exercise-result-actions">{onDefer ? <button type="button" onClick={() => onDefer(exercise.id)} className="lesson-exercise-action lesson-exercise-action-later" aria-label="Continue later and keep this task in your mistakes">{solutionCopy.later}</button> : null}{grammarReviewDue && exercise.allowExtraExercise && !extraExercise ? <button type="button" onClick={loadExtraPractice} disabled={extraSending} className="lesson-exercise-action lesson-exercise-action-primary">{extraSending ? "Preparing focused practice…" : "Practise this rule again"}</button> : null}</div></section> : null}
    {visibleFeedback ? <section className="lesson-exercise-feedback">{visibleFeedback.correctAnswer !== null && !result?.isCorrect && !explanationAlreadyStatesAnswer(visibleFeedback.explanation, visibleFeedback.correctAnswer) ? <div className="lesson-exercise-answer-reveal"><span>{answerFeedback.correctAnswer}</span><AnswerReveal answer={visibleFeedback.correctAnswer} /></div> : null}{visibleFeedback.explanation ? <div className="lesson-exercise-explanation"><strong>{explanationLabel}</strong><p>{visibleFeedback.explanation}</p></div> : null}{visibleFeedback.feedback?.example ? <p className="lesson-exercise-feedback-example">{solutionCopy.example} {visibleFeedback.feedback.example}</p> : null}{visibleFeedback.feedback?.theoryHref ? <Link href={visibleFeedback.feedback.theoryHref} className="lesson-exercise-feedback-rule">{solutionCopy.reviewRule}</Link> : null}{visibleFeedback.feedback?.errorDetails.length ? <details className="lesson-exercise-feedback-details"><summary>{solutionCopy.allErrors}</summary><ul>{visibleFeedback.feedback.errorDetails.map((detail, index) => <li key={`${detail.incorrect}-${index}`}><s>{detail.incorrect}</s> → <strong>{detail.correction}</strong>{detail.explanation ? ` — ${detail.explanation}` : ""}</li>)}</ul></details> : null}</section> : null}
    {result && !result.isCorrect ? <button type="button" onClick={restartExercise} className="lesson-exercise-retry-button">{retryLabel}</button> : null}
    {extraExercise ? <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="mb-3 text-base font-bold text-slate-900">Extra practice</h3><ExerciseRenderer exercise={extraExercise} /></div> : null}
  </section>;
}
