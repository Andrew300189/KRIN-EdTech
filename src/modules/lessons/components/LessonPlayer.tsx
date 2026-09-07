"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LessonVocabularyPanel } from "@/modules/vocabulary/components/LessonVocabularyPanel";
import { LessonWordHoverDictionary } from "@/modules/vocabulary/components/LessonWordHoverDictionary";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { ExperienceStatus } from "@/modules/motivation/components/ExperienceStatus";
import { LessonXpBadge } from "@/modules/motivation/components/LessonXpBadge";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { CourseCompletionReview } from "@/modules/courses/components/CourseCompletionReview";
import { CourseLocaleSync } from "@/modules/courses/components/CourseLocaleSync";
import { LessonSuccessEffects, type LessonSuccessEffect } from "./LessonSuccessEffects";
import { LessonRewardWheel } from "./LessonRewardWheel";
import { LessonBlockRenderer } from "./LessonBlockRenderer";
import { asObject, asStringArray, type LessonBlock } from "./lesson-content";
import { isSpacedReviewSettings } from "@/modules/lessons/utils/spaced-review";
import { shouldBurstLessonConfetti } from "@/modules/lessons/utils/lesson-celebration";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";
import { useLocale } from "@/core/i18n/locale";
import styles from "./FocusLessonPlayer.module.css";

type StoredProgress = {
  status: "STARTED" | "COMPLETED";
  completedBlocks: unknown;
  currentBlockId: string | null;
  completionPercent: number;
  score: number;
  grade: number | null;
  hintsUsed: number;
  solutionsOpened: number;
  activeSeconds: number;
  totalSeconds: number;
  motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean } | null;
  attemptAccuracy?: {
    correctAnswers: number;
    incorrectAnswers: number;
    attemptedExercises: number;
    exerciseResults: Array<{ exerciseId: string; blockId: string; isCorrect: boolean }>;
  };
};

/**
 * The learner moves through a lesson entirely in React state. This is the
 * small, serialisable snapshot that is flushed at a meaningful boundary
 * (exit, completion, or page unload), rather than on every next/back click.
 */
type PendingLessonProgress = {
  completed: string[];
  current: string | null;
  activeSeconds: number;
};

function progressSnapshotSignature(snapshot: PendingLessonProgress) {
  return JSON.stringify(snapshot);
}

type LessonWord = {
  wordId: string;
  role: string;
  isRequired: boolean;
  word: { lemma: string; partOfSpeech: string | null; meanings: Array<{ translation: string | null; definition: string }> };
};

type Props = {
  lessonId: string;
  courseSlug: string;
  moduleTitle: string;
  title: string;
  estimatedDuration: number;
  objectives: unknown;
  blocks: LessonBlock[];
  lessons: Array<{ slug: string; title: string; order: number }>;
  currentSlug: string;
  canSaveProgress: boolean;
  vocabulary?: LessonWord[];
  warmUpSessionId?: string | null;
  warmUpRequired?: boolean;
  autoUnlockNextLesson?: boolean;
  isFirstCourseLesson?: boolean;
  /** Uses the same learner player but keeps draft answers in the browser only. */
  previewMode?: boolean;
  returnHref?: string;
  /** Optional localized public path. Data APIs continue to use canonical IDs. */
  lessonHrefPrefix?: string;
  /** Keeps controls in sync with a localized course route. */
  contentLocale?: "ru" | "uk";
  /** Set by a locale-specific route to avoid changing a shared localized link. */
  routeLocale?: "ru" | "uk";
  /** A secure, user-owned error review opened from My mistakes. */
  reviewMistake?: { exerciseId: string; returnHref: string };
  /** A server-owned sequence of outstanding mistakes. */
  reviewSession?: { runId: string; exerciseIds: string[]; initialMistakeCount: number; initialExerciseId?: string };
};

function exerciseTheory(block: LessonBlock) {
  const firstExercise = block.exercises[0];
  if (!firstExercise) return null;
  const context = asObject(asObject(firstExercise.content).authoringContext);
  if (context.visible === false || typeof context.text !== "string" || !context.text.trim()) return null;
  return context.text.trim();
}

/** A CMS author can set a concise, step-specific goal separately from theory. */
function learnerGoalForBlock(block: LessonBlock) {
  const goal = asObject(block.settings).lessonGoal;
  return typeof goal === "string" && goal.trim() ? goal.trim() : null;
}

/** A short grammar rule is intentionally separate from the learner's goal. */
function learnerRuleForBlock(block: LessonBlock, locale: string) {
  const settings = asObject(block.settings);
  const translatedRules = asObject(settings.practiceRuleTranslations);
  const translatedRule = translatedRules[locale];
  if (typeof translatedRule === "string" && translatedRule.trim()) return translatedRule.trim();

  const rule = settings.practiceRule;
  return typeof rule === "string" && rule.trim() ? rule.trim() : null;
}

const blockHeaderCopy: Record<string, { rule: string; goal: string }> = {
  en: { rule: "Step rule", goal: "Lesson goal" },
  ru: { rule: "Правило шага", goal: "Цель урока" },
  uk: { rule: "Правило кроку", goal: "Мета уроку" },
};

function isSpacedReviewBlock(block: LessonBlock | null | undefined) {
  return Boolean(block && block.type === "REVIEW" && isSpacedReviewSettings(block.settings));
}

/** A lesson may be edited after someone has started it. Never let a removed
 * block id from an older progress snapshot inflate the percentage or lock the
 * current lesson. */
function validCompletedBlockIds(value: unknown, blocks: LessonBlock[]) {
  const validIds = new Set(blocks.map((block) => block.id));
  return [...new Set(asStringArray(value).filter((blockId) => validIds.has(blockId)))];
}

function validCurrentBlockId(value: unknown, blocks: LessonBlock[]) {
  return typeof value === "string" && blocks.some((block) => block.id === value)
    ? value
    : blocks[0]?.id ?? null;
}

function getBlockAttemptVisual(
  block: LessonBlock,
  exerciseResults: Record<string, boolean>,
  fallbackToCompletedColour = false,
) {
  if (block.exercises.length === 0) return null;
  let correct = 0;
  let incorrect = 0;
  const stops = block.exercises.map((exercise, index) => {
    const result = exerciseResults[exercise.id];
    if (result === true) correct += 1;
    if (result === false) incorrect += 1;
    const start = (index / block.exercises.length) * 100;
    const end = ((index + 1) / block.exercises.length) * 100;
    // A completed step may contain newly added prompts or an older attempt
    // snapshot may not include every exercise yet. Those prompts are already
    // part of a passed lesson, not unfinished work, so keep the completed
    // green rather than drawing a misleading grey gap.
    const colour = result === true
      ? "#22c55e"
      : result === false
        ? "#fb7185"
        : fallbackToCompletedColour
          ? "#22c55e"
          : "#e5e7eb";
    return `${colour} ${start}% ${end}%`;
  });
  if (correct + incorrect === 0) return null;
  return {
    correct,
    incorrect,
    // The segment stays large, while its fill follows each answer in order.
    style: { background: `linear-gradient(90deg, ${stops.join(", ")})` } as CSSProperties,
  };
}

function getBlockProgressFraction(
  block: LessonBlock,
  completedBlockIds: readonly string[],
  correctExerciseIds: ReadonlySet<string>,
) {
  // Exercise steps advance the visual finish line only through correct
  // answers. A learner may leave a wrong answer for review and still move on,
  // but that must not make the dopamine progress bar jump ahead.
  if (block.exercises.length > 0) {
    return block.exercises.filter((exercise) => correctExerciseIds.has(exercise.id)).length / block.exercises.length;
  }
  return completedBlockIds.includes(block.id) ? 1 : 0;
}

const lessonFeedbackCopy = {
  en: {
    complete: "Lesson complete",
    saved: "Session saved",
    triumph: "You did it!",
    savedTitle: "Your progress is saved.",
    triumphDescription: "Every completed step is now part of your learning progress. Take a moment — you earned it.",
    savedDescription: "Finish the remaining required steps whenever you are ready.",
    reward: "Lesson reward",
    backToCourse: "Back to course",
    nextLesson: "Continue to next lesson",
    openNextLesson: "Open next lesson",
  },
  ru: {
    complete: "Урок завершён",
    saved: "Прогресс сохранён",
    triumph: "Вы сделали это!",
    savedTitle: "Ваш прогресс сохранён.",
    triumphDescription: "Все пройденные шаги уже в вашем прогрессе. Остановитесь на секунду — вы это заслужили.",
    savedDescription: "Когда будете готовы, завершите оставшиеся обязательные шаги.",
    reward: "Награда за урок",
    backToCourse: "Вернуться к курсу",
    nextLesson: "К следующему уроку",
    openNextLesson: "Открыть следующий урок",
  },
  uk: {
    complete: "Урок завершено",
    saved: "Прогрес збережено",
    triumph: "Ви це зробили!",
    savedTitle: "Ваш прогрес збережено.",
    triumphDescription: "Усі пройдені кроки вже у вашому прогресі. Зупиніться на мить — ви це заслужили.",
    savedDescription: "Коли будете готові, завершіть решту обов’язкових кроків.",
    reward: "Нагорода за урок",
    backToCourse: "Повернутися до курсу",
    nextLesson: "До наступного уроку",
    openNextLesson: "Відкрити наступний урок",
  },
} as const;

const lessonChromeCopy = {
  en: {
    previousStep: "Previous step", nextStep: "Next step", finishLesson: "Finish lesson", finish: "Finish",
    saveAndExit: "Save & exit", backToCourse: "Back to course", preview: "Preview", active: "Active",
    minutes: "min", selfPaced: "Self-paced", score: "Score", theoryForStep: "Theory for this step",
    theoryDescription: "Use this explanation while you practise", showTheory: "Show theory", hideTheory: "Hide theory",
    requiredStep: "Required step", noStepsTitle: "No lesson steps yet", noStepsDescription: "Add content blocks in the lesson editor to build the learner flow.",
    goalFallback: "Take one focused step at a time.", step: "step",
  },
  ru: {
    previousStep: "Предыдущий шаг", nextStep: "Следующий шаг", finishLesson: "Завершить урок", finish: "Готово",
    saveAndExit: "Сохранить и выйти", backToCourse: "К содержанию курса", preview: "Предпросмотр", active: "Время",
    minutes: "мин", selfPaced: "В своём темпе", score: "Баллы", theoryForStep: "Теория к этому шагу",
    theoryDescription: "Используйте это объяснение во время практики", showTheory: "Показать теорию", hideTheory: "Скрыть теорию",
    requiredStep: "Обязательный шаг", noStepsTitle: "В уроке пока нет шагов", noStepsDescription: "Добавьте блоки в редакторе урока, чтобы собрать учебный путь.",
    goalFallback: "Двигайтесь по одному понятному шагу за раз.", step: "шаг",
  },
  uk: {
    previousStep: "Попередній крок", nextStep: "Наступний крок", finishLesson: "Завершити урок", finish: "Готово",
    saveAndExit: "Зберегти й вийти", backToCourse: "До змісту курсу", preview: "Попередній перегляд", active: "Час",
    minutes: "хв", selfPaced: "У своєму темпі", score: "Бали", theoryForStep: "Теорія до цього кроку",
    theoryDescription: "Користуйтеся цим поясненням під час практики", showTheory: "Показати теорію", hideTheory: "Сховати теорію",
    requiredStep: "Обов’язковий крок", noStepsTitle: "В уроці ще немає кроків", noStepsDescription: "Додайте блоки в редакторі уроку, щоб побудувати навчальний шлях.",
    goalFallback: "Рухайтеся одним зрозумілим кроком за раз.", step: "крок",
  },
} as const;

const blockTypeCopy = {
  THEORY: { en: "Theory", ru: "Теория", uk: "Теорія" },
  INTRO: { en: "Introduction", ru: "Введение", uk: "Вступ" },
  EXERCISE: { en: "Exercise", ru: "Задание", uk: "Завдання" },
  REVIEW: { en: "Review", ru: "Повторение", uk: "Повторення" },
  HOMEWORK: { en: "Homework", ru: "Домашнее задание", uk: "Домашнє завдання" },
  VOCABULARY: { en: "Vocabulary", ru: "Словарь", uk: "Словник" },
  PHRASE_OF_THE_DAY: { en: "Phrase of the day", ru: "Фраза дня", uk: "Фраза дня" },
  VIDEO: { en: "Video", ru: "Видео", uk: "Відео" },
  AUDIO: { en: "Audio", ru: "Аудио", uk: "Аудіо" },
  IMAGE: { en: "Image", ru: "Изображение", uk: "Зображення" },
  LISTENING: { en: "Listening", ru: "Аудирование", uk: "Аудіювання" },
} as const;

function localizedBlockType(type: string, locale: "en" | "ru" | "uk") {
  const copy = blockTypeCopy[type as keyof typeof blockTypeCopy];
  return copy ? copy[locale] : type.replace(/_/g, " ");
}

export function LessonPlayer({
  lessonId, courseSlug, moduleTitle, title, estimatedDuration, objectives, blocks, lessons,
  currentSlug, canSaveProgress, vocabulary = [], warmUpSessionId, warmUpRequired = false,
  autoUnlockNextLesson = true, isFirstCourseLesson = false, previewMode = false, returnHref, lessonHrefPrefix,
  reviewMistake, reviewSession, contentLocale, routeLocale,
}: Props) {
  const { locale: selectedLocale } = useLocale();
  const locale = contentLocale ?? selectedLocale;
  const router = useRouter();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const reviewTargetExerciseId = reviewMistake?.exerciseId ?? reviewSession?.initialExerciseId;
  const reviewBlockId = blocks.find((block) => block.exercises.some((exercise) => exercise.id === reviewTargetExerciseId))?.id ?? null;
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(reviewBlockId ?? blocks[0]?.id ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [storedProgress, setStoredProgress] = useState<StoredProgress | null>(null);
  const [progressHydrated, setProgressHydrated] = useState(previewMode || !canSaveProgress || Boolean(reviewSession));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const [lessonReward, setLessonReward] = useState<NonNullable<StoredProgress["motivationReward"]> | null>(null);
  const [warmUpDone, setWarmUpDone] = useState(!warmUpSessionId);
  const [skippingWarmUp, setSkippingWarmUp] = useState(false);
  const [theoryCollapsed, setTheoryCollapsed] = useState(false);
  const [stepVerified, setStepVerified] = useState(false);
  const [finished, setFinished] = useState(false);
  const [exerciseResults, setExerciseResults] = useState<Record<string, boolean>>({});
  const [visitExerciseIds, setVisitExerciseIds] = useState<string[]>([]);
  const [autoAdvanceRequested, setAutoAdvanceRequested] = useState(false);
  const [reviewReturnPending, setReviewReturnPending] = useState(false);
  const [reviewIntroOpen, setReviewIntroOpen] = useState(Boolean(reviewSession));
  const [reviewTransition, setReviewTransition] = useState<null | { state: "NEXT" | "WRAP"; nextUrl: string; nextLessonTitle: string; nextCourseTitle: string; remainingLessons: number }>(null);
  const [reviewComplete, setReviewComplete] = useState<null | { experience: number; coins: number; firstFocusedRun: boolean; achievements: string[] }>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [startingAllMistakesReview, setStartingAllMistakesReview] = useState(false);
  const [hasUnresolvedMistakes, setHasUnresolvedMistakes] = useState(false);
  const [practiceBlockIds, setPracticeBlockIds] = useState<string[]>([]);
  const [persistentStreakTone, setPersistentStreakTone] = useState<string | null>(null);
  const [successEffect, setSuccessEffect] = useState<LessonSuccessEffect | null>(null);
  const hasGuestPreviewRef = useRef(false);
  const isPracticeRunRef = useRef(false);
  const previewCompleteReported = useRef(false);
  const progressMutationRef = useRef(false);
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const reviewReturnTimerRef = useRef<number | null>(null);
  const reviewReturnStartedRef = useRef(false);
  const reviewAdvanceStartedRef = useRef(false);
  const advanceStepRef = useRef<() => void>(() => undefined);
  const successEffectSequenceRef = useRef(0);
  const pendingProgressRef = useRef<PendingLessonProgress>({
    completed: [],
    current: reviewBlockId ?? blocks[0]?.id ?? null,
    activeSeconds: 0,
  });
  const persistedProgressSignatureRef = useRef<string | null>(null);

  useEffect(() => { if (saveError) toast.error(saveError); }, [saveError]);
  useEffect(() => { if (reviewError) toast.error(reviewError); }, [reviewError]);

  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const objectiveItems = asStringArray(objectives);
  const activeIndex = Math.max(0, blocks.findIndex((block) => block.id === currentBlockId));
  const activeBlock = blocks[activeIndex] ?? null;
  const activeBlockRule = activeBlock ? learnerRuleForBlock(activeBlock, locale) : null;
  const headerCopy = blockHeaderCopy[locale] ?? blockHeaderCopy.en;
  const chromeCopy = lessonChromeCopy[locale] ?? lessonChromeCopy.en;
  const activeAttemptedExerciseIds = activeBlock?.exercises
    .filter((exercise) => Object.prototype.hasOwnProperty.call(exerciseResults, exercise.id))
    .map((exercise) => exercise.id) ?? [];
  const activeBlockAttemptsComplete = Boolean(
    activeBlock?.type === "EXERCISE"
    && activeBlock.exercises.length > 0
    && activeBlock.exercises.every((exercise) => Object.prototype.hasOwnProperty.call(exerciseResults, exercise.id)),
  );
  const isFinalBlock = Boolean(activeBlock && activeIndex === blocks.length - 1);
  const isReviewSession = Boolean(reviewSession);
  const reviewDialogOpen = Boolean(reviewIntroOpen || reviewTransition || reviewComplete);
  const activeTheory = activeBlock?.type === "EXERCISE" ? exerciseTheory(activeBlock) : null;
  const isInteractiveStep = Boolean(
    (activeBlock?.type === "EXERCISE" && activeBlock.exercises.length)
    || (!previewMode && isSpacedReviewBlock(activeBlock)),
  );
  const lessonIsCompleted = storedProgress?.status === "COMPLETED";
  const canAdvance = Boolean(activeBlock && (lessonIsCompleted || !isInteractiveStep || stepVerified || completedBlocks.includes(activeBlock.id)));
  const correctExerciseIds = useMemo(
    () => new Set(Object.entries(exerciseResults).filter(([, isCorrect]) => isCorrect).map(([exerciseId]) => exerciseId)),
    [exerciseResults],
  );
  const progressPercent = useMemo(() => {
    if (blocks.length === 0) return 0;

    // A completed lesson keeps its historical 100% status. A new or resumed
    // lesson fills each large step according to its individual answers.
    if (lessonIsCompleted && !isPracticeRunRef.current) return 100;
    const visitedBlocks = isPracticeRunRef.current ? practiceBlockIds : completedBlocks;
    const completedFraction = blocks.reduce(
      (total, block) => total + getBlockProgressFraction(block, visitedBlocks, correctExerciseIds),
      0,
    );
    return Math.round((completedFraction / blocks.length) * 100);
  }, [blocks, completedBlocks, correctExerciseIds, lessonIsCompleted, practiceBlockIds]);
  const progressLabel = lessonIsCompleted
    ? locale === "uk" ? `Практика · ${progressPercent}% повторено` : locale === "ru" ? `Практика · ${progressPercent}% повторено` : `Practice · ${progressPercent}% revisited`
    : locale === "uk" ? `${progressPercent}% завершено` : locale === "ru" ? `${progressPercent}% пройдено` : `${progressPercent}% complete`;
  const hasUnfinishedRequiredBlocks = useMemo(
    () => blocks.some((block) => block.isRequired && !completedBlocks.includes(block.id)),
    [blocks, completedBlocks],
  );
  const guestPreviewKey = `krin:lesson-preview:${lessonId}`;
  const destination = reviewSession ? "/student/mistakes" : (returnHref ?? `/courses/${courseSlug}`);

  // Keep a synchronous copy as well as React state. `pagehide` has no render
  // cycle to wait for, so this guarantees that a tab/window close sends the
  // learner's latest location in one compact request.
  useEffect(() => {
    pendingProgressRef.current = {
      completed: completedBlocks,
      current: currentBlockId,
      activeSeconds: elapsedSeconds,
    };
  }, [completedBlocks, currentBlockId, elapsedSeconds]);

  useEffect(() => {
    if (previewMode) return;
    if (canSaveProgress) {
      if (isFirstCourseLesson) reportFunnelEvent("FIRST_LESSON_START");
      return;
    }
    reportFunnelEvent("PREVIEW_LESSON_START");
  }, [canSaveProgress, isFirstCourseLesson, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress) {
      setHasUnresolvedMistakes(false);
      return;
    }

    let current = true;
    const reviewAvailabilityUrl = new URL("/api/profile/mistakes/review-runs", window.location.origin);
    reviewAvailabilityUrl.searchParams.set("courseSlug", courseSlug);
    reviewAvailabilityUrl.searchParams.set("lessonSlug", currentSlug);

    void fetch(reviewAvailabilityUrl, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { data?: { hasUnresolvedMistakes?: boolean } } : null)
      .then((payload) => {
        if (current) setHasUnresolvedMistakes(Boolean(payload?.data?.hasUnresolvedMistakes));
      })
      .catch(() => {
        if (current) setHasUnresolvedMistakes(false);
      });

    return () => { current = false; };
  }, [canSaveProgress, courseSlug, currentSlug, finished, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress || isReviewSession) return;
    try {
      const raw = window.localStorage.getItem(guestPreviewKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { completedBlocks?: unknown; currentBlockId?: unknown; activeSeconds?: unknown };
      const restoredBlocks = validCompletedBlockIds(saved.completedBlocks, blocks);
      const restoredCurrentBlock = validCurrentBlockId(saved.currentBlockId, blocks);
      const restoredSeconds = typeof saved.activeSeconds === "number" && Number.isFinite(saved.activeSeconds) ? Math.max(0, Math.floor(saved.activeSeconds)) : 0;
      hasGuestPreviewRef.current = true;
      setCompletedBlocks(restoredBlocks);
      setCurrentBlockId(restoredCurrentBlock);
      setElapsedSeconds(restoredSeconds);
      void fetch(`/api/learning/lessons/${lessonId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedBlockIds: restoredBlocks, currentBlockId: restoredCurrentBlock, activeSeconds: restoredSeconds, complete: false }),
      }).then((response) => { if (response.ok) window.localStorage.removeItem(guestPreviewKey); }).catch(() => undefined);
    } catch {
      window.localStorage.removeItem(guestPreviewKey);
    }
  }, [blocks, canSaveProgress, guestPreviewKey, isReviewSession, lessonId, previewMode]);

  useEffect(() => {
    if (previewMode || canSaveProgress || isReviewSession) return;
    try {
      window.localStorage.setItem(guestPreviewKey, JSON.stringify({ completedBlocks, currentBlockId, activeSeconds: elapsedSeconds }));
    } catch {
      // Storage is optional; an unauthenticated learner can still use the lesson.
    }
  }, [canSaveProgress, completedBlocks, currentBlockId, elapsedSeconds, guestPreviewKey, isReviewSession, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress || isReviewSession) {
      setProgressHydrated(true);
      return;
    }
    setProgressHydrated(false);
    let live = true;
    void fetch(`/api/learning/lessons/${lessonId}/progress`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { data?: StoredProgress | null } | null) => {
        if (!live || !payload?.data || hasGuestPreviewRef.current || progressMutationRef.current) return;
        const saved = payload.data;
        const restoredBlocks = validCompletedBlockIds(saved.completedBlocks, blocks);
        const restoredCurrentBlock = validCurrentBlockId(saved.currentBlockId, blocks);
        setStoredProgress({ ...saved, completedBlocks: restoredBlocks, currentBlockId: restoredCurrentBlock });
        const savedResults = Object.fromEntries(
          (saved.attemptAccuracy?.exerciseResults ?? []).map((item) => [item.exerciseId, item.isCorrect]),
        );
        // The progress request races with a learner's first answer on a slow
        // connection.  Never replace a result already received in this visit
        // with an older server snapshot, otherwise a timeline segment flashes
        // back to its pending colour.  This merge is shared by all lessons.
        setExerciseResults((current) => ({ ...savedResults, ...current }));
        if (reviewBlockId) {
          isPracticeRunRef.current = true;
          setPracticeBlockIds([]);
          setCompletedBlocks(restoredBlocks);
          setCurrentBlockId(reviewBlockId);
        } else if (saved.status === "COMPLETED") {
          // Returning to a completed lesson must show its saved completion
          // state. Practice remains available from the timeline, but never
          // silently restarts the first task in the first exercise block.
          isPracticeRunRef.current = false;
          setPracticeBlockIds([]);
          setCompletedBlocks(restoredBlocks);
          setCurrentBlockId(restoredCurrentBlock);
          setFinished(true);
        } else {
          isPracticeRunRef.current = false;
          setPracticeBlockIds([]);
          // Resuming an unfinished lesson preserves every prompt that was
          // already attempted before the page was reopened.
          setVisitExerciseIds((current) => [
            ...new Set([...Object.keys(savedResults), ...current]),
          ]);
          setCompletedBlocks(restoredBlocks);
          setCurrentBlockId(restoredCurrentBlock);
        }
        setElapsedSeconds(saved.activeSeconds ?? 0);
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setProgressHydrated(true);
      });
    return () => { live = false; };
  }, [blocks, canSaveProgress, isReviewSession, lessonId, previewMode, reviewBlockId]);

  useEffect(() => {
    if (previewMode || !canSaveProgress || isReviewSession) return;
    let live = true;
    const noteInteraction = () => { interactionCount.current += 1; };
    const create = async () => {
      const response = await fetch("/api/learning/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "LESSON", lessonId }) });
      const payload = await response.json().catch(() => null) as { data?: { id?: string } } | null;
      if (live) learningSessionId.current = payload?.data?.id ?? null;
    };
    const heartbeat = () => {
      if (!live || document.visibilityState !== "visible" || !learningSessionId.current) return;
      void fetch(`/api/learning/sessions/${learningSessionId.current}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientTimestamp: new Date().toISOString(), interactionCount: interactionCount.current }) }).catch(() => undefined);
    };
    void create();
    window.addEventListener("pointerdown", noteInteraction);
    window.addEventListener("keydown", noteInteraction);
    // Presence is useful for active-learning analytics, but a minute is
    // enough resolution and halves serverless/DB writes from this channel.
    const timer = window.setInterval(heartbeat, 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", noteInteraction);
      window.removeEventListener("keydown", noteInteraction);
      if (learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined);
    };
  }, [canSaveProgress, isReviewSession, lessonId, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [previewMode]);

  useEffect(() => {
    setTheoryCollapsed(false);
    setStepVerified(Boolean(activeBlock && (
      !isInteractiveStep
      || completedBlocks.includes(activeBlock.id)
      || activeBlockAttemptsComplete
    )));
  }, [activeBlock, activeBlockAttemptsComplete, completedBlocks, isInteractiveStep]);

  useEffect(() => {
    if (!autoAdvanceRequested || !canAdvance) return;
    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
    // Leave the feedback in view briefly, then continue from the completed
    // exercise block without another repetitive click.
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      advanceStepRef.current();
    }, 1_250);
    return () => {
      if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    };
  }, [activeBlock?.id, autoAdvanceRequested, canAdvance]);

  useEffect(() => () => {
    if (reviewReturnTimerRef.current !== null) window.clearTimeout(reviewReturnTimerRef.current);
  }, []);

  function returnToMistakesAfterSuccess() {
    if (!reviewMistake || reviewReturnStartedRef.current) return;
    reviewReturnStartedRef.current = true;
    setReviewReturnPending(true);
    reviewReturnTimerRef.current = window.setTimeout(() => {
      router.replace(reviewMistake.returnHref);
    }, 900);
  }

  async function advanceReviewRun() {
    if (!reviewSession || reviewAdvanceStartedRef.current) return;
    reviewAdvanceStartedRef.current = true;
    setReviewError(null);
    try {
      const response = await fetch(`/api/profile/mistakes/review-runs/${encodeURIComponent(reviewSession.runId)}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const payload = await response.json().catch(() => null) as {
        data?: { state: "CURRENT_INCOMPLETE" | "NEXT" | "WRAP" | "COMPLETE"; nextUrl?: string; nextLessonTitle?: string; nextCourseTitle?: string; remainingLessons?: number; reward?: { experience: number; coins: number; firstFocusedRun: boolean; achievements: string[] } };
        error?: string;
      } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to update your review.");
      if (payload.data.state === "CURRENT_INCOMPLETE") {
        reviewAdvanceStartedRef.current = false;
        setReviewError("Finish every saved mistake in this lesson before moving on.");
        return;
      }
      if (payload.data.state === "COMPLETE" && payload.data.reward) {
        setReviewComplete(payload.data.reward);
        notifyMotivationUpdated();
        return;
      }
      if ((payload.data.state === "NEXT" || payload.data.state === "WRAP") && payload.data.nextUrl && payload.data.nextLessonTitle && payload.data.nextCourseTitle) {
        setReviewTransition({
          state: payload.data.state,
          nextUrl: payload.data.nextUrl,
          nextLessonTitle: payload.data.nextLessonTitle,
          nextCourseTitle: payload.data.nextCourseTitle,
          remainingLessons: payload.data.remainingLessons ?? 1,
        });
        return;
      }
      throw new Error("Unable to find the next review lesson.");
    } catch (error) {
      reviewAdvanceStartedRef.current = false;
      setReviewError(error instanceof Error ? error.message : "Unable to update your review.");
    }
  }

  async function persistProgress(complete = false, snapshot?: PendingLessonProgress) {
    if (previewMode || !canSaveProgress || isReviewSession) return null;
    const savedSnapshot = snapshot ?? pendingProgressRef.current;
    const savedCompleted = savedSnapshot.completed;
    const savedCurrent = savedSnapshot.current;
    setSaveError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedBlockIds: savedCompleted, currentBlockId: savedCurrent, activeSeconds: savedSnapshot.activeSeconds, complete }),
    });
    const payload = await response.json() as { data?: StoredProgress; error?: string };
    if (!response.ok || !payload.data) {
      setSaveError(payload.error ?? "Unable to save your progress.");
      return null;
    }
    persistedProgressSignatureRef.current = progressSnapshotSignature(savedSnapshot);
    setStoredProgress(payload.data);
    if (complete) setLessonReward(payload.data.motivationReward ?? null);
    if (payload.data.motivationReward?.awarded) {
      const reward = payload.data.motivationReward;
      setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "Lesson reward", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
      notifyMotivationUpdated();
    }
    if (complete && learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined);
    if (complete && payload.data.status === "COMPLETED" && isFirstCourseLesson) reportFunnelEvent("FIRST_LESSON_COMPLETE");
    return payload.data;
  }

  useEffect(() => {
    if (previewMode || !canSaveProgress || isReviewSession) return;
    const flushBeforePageCloses = () => {
      const snapshot = pendingProgressRef.current;
      // Explicit Save & exit and lesson completion already persisted this
      // exact snapshot. Do not duplicate that write during route teardown.
      if (persistedProgressSignatureRef.current === progressSnapshotSignature(snapshot)) return;
      // `keepalive` lets the browser finish this single small request while a
      // user closes a tab or changes page. It is a safety net, not a timer.
      void fetch(`/api/learning/lessons/${lessonId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedBlockIds: snapshot.completed,
          currentBlockId: snapshot.current,
          activeSeconds: snapshot.activeSeconds,
          complete: false,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", flushBeforePageCloses);
    return () => window.removeEventListener("pagehide", flushBeforePageCloses);
  }, [canSaveProgress, isReviewSession, lessonId, previewMode]);

  function triggerSuccessEffect(burst: boolean) {
    successEffectSequenceRef.current += 1;
    setSuccessEffect({ id: successEffectSequenceRef.current, burst });
  }

  async function advanceStep() {
    if (!activeBlock || !canAdvance) return;
    progressMutationRef.current = true;
    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
    setAutoAdvanceRequested(false);
    const nextCompleted = completedBlocks.includes(activeBlock.id) ? completedBlocks : [...completedBlocks, activeBlock.id];
    if (isPracticeRunRef.current) {
      setPracticeBlockIds((current) => current.includes(activeBlock.id) ? current : [...current, activeBlock.id]);
    }
    const nextBlock = blocks[activeIndex + 1] ?? null;
    setCompletedBlocks(nextCompleted);
    if (nextBlock) {
      setCurrentBlockId(nextBlock.id);
      pendingProgressRef.current = { completed: nextCompleted, current: nextBlock.id, activeSeconds: elapsedSeconds };
      return;
    }

    // Timeline navigation stays open: a learner may leave an incorrect or
    // skipped task behind without being redirected to an unrelated block.
    const firstIncompleteRequiredBlock = blocks.find((block) => block.isRequired && !nextCompleted.includes(block.id));
    if (firstIncompleteRequiredBlock) {
      pendingProgressRef.current = { completed: nextCompleted, current: activeBlock.id, activeSeconds: elapsedSeconds };
      setFinished(true);
      return;
    }

    const completionSnapshot = { completed: nextCompleted, current: activeBlock.id, activeSeconds: elapsedSeconds };
    pendingProgressRef.current = completionSnapshot;
    const saved = await persistProgress(true, completionSnapshot);
    if (canSaveProgress && !saved) return;
    if (!previewMode && !canSaveProgress && !previewCompleteReported.current) {
      previewCompleteReported.current = true;
      reportFunnelEvent("PREVIEW_LESSON_COMPLETE");
    }
    // A completed lesson deserves a moment of closure. The next lesson remains
    // available on the success screen instead of navigating away immediately.
    if (!isPracticeRunRef.current && (!canSaveProgress || saved?.status === "COMPLETED")) {
      triggerSuccessEffect(shouldBurstLessonConfetti({ isLessonComplete: true }));
    }
    setFinished(true);
  }

  function goToPreviousBlock() {
    const previousBlock = blocks[activeIndex - 1];
    if (!previousBlock) return;
    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
    setAutoAdvanceRequested(false);
    setCurrentBlockId(previousBlock.id);
    pendingProgressRef.current = { completed: completedBlocks, current: previousBlock.id, activeSeconds: elapsedSeconds };
  }

  advanceStepRef.current = () => { void advanceStep(); };

  async function leaveLesson() {
    const saved = await persistProgress(false);
    if (canSaveProgress && !previewMode && !saved) return;
    router.push(destination);
  }

  async function openCourseContent() {
    const saved = await persistProgress(false);
    if (canSaveProgress && !previewMode && !saved) return;
    router.push(`/courses/${courseSlug}?content=open`);
  }

  async function startAllMistakesReview() {
    if (startingAllMistakesReview || !canSaveProgress || previewMode) return;
    setStartingAllMistakesReview(true);
    setReviewError(null);
    try {
      const response = await fetch("/api/profile/mistakes/review-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "COURSE", courseSlug, lessonSlug: currentSlug }),
      });
      const payload = await response.json().catch(() => null) as {
        data?: { nextUrl?: string } | null;
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to start your mistake review.");
      if (!payload?.data?.nextUrl) {
        setHasUnresolvedMistakes(false);
        return;
      }
      router.push(payload.data.nextUrl);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to start your mistake review.");
    } finally {
      setStartingAllMistakesReview(false);
    }
  }

  async function skipWarmUp() {
    if (!warmUpSessionId) return;
    setSkippingWarmUp(true);
    try {
      const response = await fetch(`/api/profile/vocabulary/sessions/${warmUpSessionId}`, { method: "DELETE" });
      if (response.ok) setWarmUpDone(true);
    } finally {
      setSkippingWarmUp(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      const isEditingText = target instanceof HTMLElement && Boolean(
        target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
      );
      if (isEditingText) return;

      if (event.key === "Escape") {
        event.preventDefault();
        void leaveLesson();
        return;
      }

      if (isReviewSession) return;
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        event.preventDefault();
        goToPreviousBlock();
        return;
      }
      if (event.key === "ArrowRight" && canAdvance) {
        event.preventDefault();
        void advanceStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // The callback deliberately uses the latest player state for navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, blocks.length, canAdvance, completedBlocks, currentBlockId, canSaveProgress, isReviewSession, previewMode]);

  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const showWarmUp = !previewMode && Boolean(warmUpSessionId && !warmUpDone);
  const feedbackCopy = lessonFeedbackCopy[locale] ?? lessonFeedbackCopy.en;
  const completionXp = lessonReward?.awarded ? lessonReward.experience : 0;

  return (
    <main className={styles.player}>
      <CourseLocaleSync courseSlug={courseSlug} routeLocale={routeLocale} />
      <RewardNotification events={rewardEvents} />
      <LessonSuccessEffects effect={successEffect} />
      {!isReviewSession && activeBlock ? (
        <nav className={styles.sideNavigation} aria-label="Lesson step navigation">
          <button
            type="button"
            className={`${styles.sideNavigationButton} ${styles.sideNavigationPrevious}`}
            disabled={activeIndex === 0}
            onClick={goToPreviousBlock}
            aria-label={chromeCopy.previousStep}
            title={chromeCopy.previousStep}
          >
            <img src="/icons/lesson-next.svg" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.sideNavigationButton} ${styles.sideNavigationNext} ${isFinalBlock ? styles.sideNavigationFinish : ""}`}
            disabled={!canAdvance}
            onClick={() => void advanceStep()}
            aria-label={isFinalBlock ? chromeCopy.finishLesson : chromeCopy.nextStep}
            title={isFinalBlock ? chromeCopy.finishLesson : chromeCopy.nextStep}
          >
            {isFinalBlock ? <span>{chromeCopy.finish}</span> : <img src="/icons/lesson-next.svg" alt="" aria-hidden="true" />}
          </button>
        </nav>
      ) : null}
      <div className={styles.frame}>
        <header className={styles.header} aria-label="Lesson controls">
          <div className={styles.headerNavigation}>
            <button type="button" className={styles.closeLink} onClick={() => void leaveLesson()} aria-label={chromeCopy.saveAndExit}>{chromeCopy.saveAndExit}</button>
            {!previewMode ? <button type="button" className={styles.backToCourseLink} onClick={() => void openCourseContent()} aria-label={chromeCopy.backToCourse}>{chromeCopy.backToCourse}</button> : null}
          </div>
          <div className={styles.progress} aria-label={`Lesson progress: ${progressLabel}`}>
            <div className={styles.progressMeta}><span>{progressLabel}</span><span>{previewMode ? chromeCopy.preview : `${chromeCopy.active} ${formattedTime}`}</span></div>
            <div className={styles.iceProgress} role="progressbar" aria-label="Correct-answer lesson progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
              <span className={styles.iceProgressFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <nav
              className={styles.blockTimeline}
              aria-label="Lesson steps. Select an available step to study or practise it."
              style={{ gridTemplateColumns: `repeat(${Math.max(blocks.length, 1)}, minmax(0, 1fr))` }}
            >
              {blocks.map((block, index) => {
                const isCompleted = completedBlocks.includes(block.id);
                const isCurrent = block.id === activeBlock?.id;
                const isReviewableAfterCompletion = Boolean(lessonIsCompleted);
                const canOpenBlock = isReviewableAfterCompletion || isCompleted || isCurrent;
                const state = isReviewableAfterCompletion || isCompleted ? "completed" : isCurrent ? "current" : "locked";
                const label = block.title?.trim() || `${localizedBlockType(block.type, locale)} ${chromeCopy.step}`;
                const attemptVisual = canOpenBlock
                  ? getBlockAttemptVisual(block, exerciseResults, isReviewableAfterCompletion || isCompleted)
                  : null;
                const performance = attemptVisual
                  ? `${attemptVisual.correct} correct, ${attemptVisual.incorrect} incorrect`
                  : "No checked exercise yet";

                return (
                  <button
                    key={block.id}
                    type="button"
                    className={`${styles.blockSegment} ${isSpacedReviewBlock(block) ? styles.blockSegmentReview : ""} ${isReviewableAfterCompletion || isCompleted ? styles.blockSegmentCompleted : ""} ${isCurrent ? styles.blockSegmentCurrent : ""}`}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${label}. ${state}. Latest result: ${performance}.${canOpenBlock ? " Open this step." : " Complete the current step first."}`}
                    style={attemptVisual?.style}
                    title={`${index + 1}. ${label}`}
                    disabled={!canOpenBlock}
                    onClick={() => {
                      if (!canOpenBlock) return;
                      setAutoAdvanceRequested(false);
                      setCurrentBlockId(block.id);
                      pendingProgressRef.current = { completed: completedBlocks, current: block.id, activeSeconds: elapsedSeconds };
                      setFinished(false);
                    }}
                  >
                    <span className={styles.blockSegmentNumber}>{index + 1}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className={styles.stepArea}>
            <ExperienceStatus />
          </div>
        </header>

        <section className={styles.lessonContext} aria-labelledby="lesson-title">
          <h1 id="lesson-title">{title}</h1>
          <p>{moduleTitle} · {estimatedDuration ? `${estimatedDuration} ${chromeCopy.minutes}` : chromeCopy.selfPaced}{storedProgress ? ` · ${chromeCopy.score} ${storedProgress.score}` : ""}</p>
        </section>

        {reviewSession && reviewIntroOpen ? <section className={styles.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="review-intro-title">
          <p className={styles.taskType}>Mistake review</p>
          <h2 id="review-intro-title">Now we focus on the mistakes from “{title}”</h2>
          <p>Correct the saved answers in this lesson. When this lesson is clear, we will offer the next lesson with mistakes — without changing your normal course progress.</p>
          <button type="button" className={styles.finishButton} onClick={() => setReviewIntroOpen(false)}>Start this review</button>
        </section> : null}

        {reviewTransition ? <section className={styles.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="review-next-title">
          <p className={styles.taskType}>{reviewTransition.state === "WRAP" ? "Review the earlier lessons" : "Next review lesson"}</p>
          <h2 id="review-next-title">{reviewTransition.state === "WRAP" ? "You have reached the end of this path." : "This lesson is clear."}</h2>
          <p>{reviewTransition.state === "WRAP" ? `There are still earlier mistakes. Start with “${reviewTransition.nextLessonTitle}” in ${reviewTransition.nextCourseTitle}?` : `Next: “${reviewTransition.nextLessonTitle}” in ${reviewTransition.nextCourseTitle}. ${reviewTransition.remainingLessons > 1 ? `${reviewTransition.remainingLessons} lessons still need a review.` : "This is the last lesson in your queue."}`}</p>
          <div className={styles.reviewDialogActions}>
            <button type="button" className={styles.showTheory} onClick={() => router.push("/student/mistakes")}>Back to mistakes</button>
            <button type="button" className={styles.finishButton} onClick={() => router.push(reviewTransition.nextUrl)}>{reviewTransition.state === "WRAP" ? "Start from this lesson" : "Continue review"}</button>
          </div>
        </section> : null}

        {reviewComplete ? <section className={styles.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="review-complete-title">
          <p className={styles.taskType}>Review complete</p>
          <h2 id="review-complete-title">All your mistakes are corrected.</h2>
          <p>{reviewComplete.firstFocusedRun ? "You cleared every saved mistake in one focused run — an ultra trophy is now yours." : "You cleared every saved mistake in this focused run. Keep this rhythm going."}</p>
          <p className={styles.reviewReward}>+{reviewComplete.experience} XP{reviewComplete.coins ? ` · +${reviewComplete.coins} coins` : ""}{reviewComplete.achievements.length ? ` · ${reviewComplete.achievements.join(", ")}` : ""}</p>
          <button type="button" className={styles.finishButton} onClick={() => router.push("/student/mistakes?reviewComplete=1")}>Back to My mistakes</button>
        </section> : null}

        {showWarmUp ? (
          <section className={styles.taskCard}>
            <p className={styles.taskType}>Before the lesson</p>
            <h2>Quick warm-up</h2>
            <p className="mt-2 text-sm text-slate-600">Review a few words selected from your recent learning progress.</p>
            <div className="mt-5"><VocabularyTrainingPlayer sessionId={warmUpSessionId!} compact onCompleted={() => setWarmUpDone(true)} /></div>
            {!warmUpRequired ? <button type="button" disabled={skippingWarmUp} onClick={() => void skipWarmUp()} className={styles.showTheory}>{skippingWarmUp ? "Skipping…" : "Skip warm-up"}</button> : null}
          </section>
        ) : finished ? (
          <section className={`${styles.completion} ${hasUnfinishedRequiredBlocks ? "" : styles.triumphScreen}`} aria-live="polite">
            <p className={styles.taskType}>{hasUnfinishedRequiredBlocks ? feedbackCopy.saved : feedbackCopy.complete}</p>
            {!hasUnfinishedRequiredBlocks ? <span className={styles.triumphIcon} aria-hidden="true">★</span> : null}
            <h2>{hasUnfinishedRequiredBlocks ? feedbackCopy.savedTitle : feedbackCopy.triumph}</h2>
            {!hasUnfinishedRequiredBlocks ? <p className={styles.triumphReward}>+{completionXp} XP <span>{feedbackCopy.reward}</span></p> : null}
            <p>{previewMode ? "This was a protected preview. Return to the editor to continue creating the lesson." : hasUnfinishedRequiredBlocks ? feedbackCopy.savedDescription : feedbackCopy.triumphDescription}</p>
            {!previewMode && lessonReward?.awarded ? <div className={styles.lessonReward}><LessonXpBadge experience={lessonReward.experience} correctAnswers={Object.values(exerciseResults).filter(Boolean).length} incorrectAnswers={Object.values(exerciseResults).filter((value) => !value).length} progressPercent={100} /><p>+{lessonReward.experience} XP{lessonReward.coins ? ` · +${lessonReward.coins} coins` : ""}</p></div> : null}
            {!previewMode && canSaveProgress && !hasUnfinishedRequiredBlocks ? <LessonRewardWheel lessonId={lessonId} /> : null}
            {!previewMode && !lessonReward?.awarded && isPracticeRunRef.current ? <p className={styles.lessonReward}>Practice complete. XP is awarded only for the first completion.</p> : null}
            {!previewMode && lessonReward && !lessonReward.awarded && !isPracticeRunRef.current ? <p className={styles.lessonReward}>Lesson complete. No XP was added under the current reward rule.</p> : null}
            {!previewMode && canSaveProgress ? <CourseCompletionReview courseSlug={courseSlug} active={finished && !hasUnfinishedRequiredBlocks} /> : null}
            <div className={styles.completionActions}>
              <button type="button" className={`${styles.finishButton} ${hasUnfinishedRequiredBlocks ? "" : styles.triumphPrimaryAction}`} onClick={() => void leaveLesson()}>{previewMode ? "Back to editor" : feedbackCopy.backToCourse}</button>
              {!previewMode && !hasUnfinishedRequiredBlocks && nextLesson ? <button type="button" className={styles.nextLessonButton} onClick={() => router.push(`${lessonHrefPrefix ?? `/courses/${courseSlug}/lessons`}/${nextLesson.slug}`)}>{autoUnlockNextLesson ? feedbackCopy.nextLesson : feedbackCopy.openNextLesson}</button> : null}
              {!previewMode && canSaveProgress && hasUnresolvedMistakes ? <button type="button" className={styles.reviewAllButton} disabled={startingAllMistakesReview} onClick={() => void startAllMistakesReview()}>{startingAllMistakesReview ? "Preparing review…" : "Fix all mistakes"}</button> : null}
            </div>
          </section>
        ) : !activeBlock ? (
          <section className={styles.empty}><h2>{chromeCopy.noStepsTitle}</h2><p>{chromeCopy.noStepsDescription}</p></section>
        ) : (
          <LessonWordHoverDictionary sourceLessonId={lessonId} words={vocabulary}>
          <section className={`${styles.workspace} ${reviewDialogOpen ? styles.workspacePaused : ""}`} aria-label="Current lesson step" aria-hidden={reviewDialogOpen}>
            {!previewMode && vocabulary.length > 0 ? <LessonVocabularyPanel lessonId={lessonId} words={vocabulary} /> : null}
            {activeTheory ? (
              <section className={styles.theory}>
                <button type="button" className={styles.theoryToggle} onClick={() => setTheoryCollapsed((value) => !value)} aria-expanded={!theoryCollapsed}>
                  <span><span className={styles.theoryEyebrow}>{chromeCopy.theoryForStep}</span><span className={styles.theoryTitle}>{chromeCopy.theoryDescription}</span></span>
                  <span>{theoryCollapsed ? chromeCopy.showTheory : chromeCopy.hideTheory}</span>
                </button>
                <div className={`${styles.theoryPanel} ${theoryCollapsed ? styles.theoryPanelCollapsed : ""}`}><div className={styles.theoryInner}><p className={styles.theoryText}>{activeTheory}</p></div></div>
              </section>
            ) : null}

            <article className={`${styles.taskCard} ${activeBlock.type === "EXERCISE" ? styles.exerciseTaskCard : ""} ${activeBlock.type !== "EXERCISE" ? styles.readingTaskCard : ""} ${activeBlock.type === "THEORY" ? styles.theoryTaskCard : ""} ${isSpacedReviewBlock(activeBlock) ? styles.spacedReviewTaskCard : ""}`}>
              {activeBlock.type !== "EXERCISE" && activeBlock.type !== "INTRO" && !isSpacedReviewBlock(activeBlock) ? <div className={styles.taskTopline}>
                <span className={styles.taskType}>{localizedBlockType(activeBlock.type, locale)}</span>
                {activeBlock.isRequired ? <span className={styles.required}>{chromeCopy.requiredStep}</span> : null}
              </div> : null}
              {!isSpacedReviewBlock(activeBlock) ? <div className={styles.lessonGoalTop}>
                <span className={styles.lessonGoalTopLabel}>{activeBlockRule ? headerCopy.rule : headerCopy.goal}</span>
                <p>{activeBlockRule ?? learnerGoalForBlock(activeBlock) ?? objectiveItems[0] ?? chromeCopy.goalFallback}</p>
              </div> : null}
              <div className={styles.focusContent} key={activeBlock.id}>
                <LessonBlockRenderer
                  lessonId={lessonId}
                  block={activeBlock}
                  contentLocale={contentLocale}
                  persistentStreakTone={persistentStreakTone}
                  completed={completedBlocks.includes(activeBlock.id)}
                  onToggleComplete={() => undefined}
                  canSaveProgress={false}
                  previewMode={previewMode}
                  hideHeader
                  playerStyle
                  hideExerciseTheoryText={Boolean(activeTheory)}
                  focusExerciseId={reviewMistake?.exerciseId ?? reviewSession?.initialExerciseId}
                  individualExerciseStep={activeBlock.type === "EXERCISE"}
                  attemptedExerciseIds={activeAttemptedExerciseIds}
                  progressHydrated={progressHydrated}
                  mistakeExerciseIds={activeBlock.exercises
                    .filter((exercise) => exerciseResults[exercise.id] === false)
                    .map((exercise) => exercise.id)}
                  requireCorrectForNext={isReviewSession || Boolean(reviewMistake)}
                  reviewRunId={reviewSession?.runId}
                  onAttemptResolved={({ exerciseId, isCorrect, isFinalExercise, difficulty, streakTone }) => {
                    progressMutationRef.current = true;
                    if (!isCorrect) setPersistentStreakTone(null);
                    else {
                      if (streakTone) setPersistentStreakTone(streakTone);
                      triggerSuccessEffect(shouldBurstLessonConfetti({ isCorrect, difficulty }));
                    }
                    const nextResults = { ...exerciseResults, [exerciseId]: isCorrect };
                    setExerciseResults(nextResults);
                    setVisitExerciseIds((current) => current.includes(exerciseId) ? current : [...current, exerciseId]);
                    if (reviewSession?.exerciseIds.includes(exerciseId)) {
                      if (!isCorrect) return;
                      const allLessonReviewExercisesResolved = reviewSession.exerciseIds.every((reviewExerciseId) => nextResults[reviewExerciseId] === true);
                      if (allLessonReviewExercisesResolved) {
                        void advanceReviewRun();
                        return;
                      }
                      const currentBlockReviewExercisesResolved = activeBlock.exercises
                        .filter((exercise) => reviewSession.exerciseIds.includes(exercise.id))
                        .every((exercise) => nextResults[exercise.id] === true);
                      if (currentBlockReviewExercisesResolved && activeIndex < blocks.length - 1) {
                        window.setTimeout(() => {
                          const nextBlock = blocks[activeIndex + 1] ?? activeBlock;
                          setCurrentBlockId(nextBlock.id);
                        }, 700);
                      }
                      return;
                    }
                    if (reviewMistake?.exerciseId === exerciseId && isCorrect) {
                      setAutoAdvanceRequested(false);
                      returnToMistakesAfterSuccess();
                      return;
                    }
                    // A learner must attempt every exercise in the current
                    // block. Correctness changes the visual result and score,
                    // but a retry is optional before moving on.
                    if (isFinalExercise) {
                      // The answer endpoint securely records the answer.
                      // The enclosing lesson progress stays local until the
                      // learner finishes or leaves, avoiding a second write
                      // for each exercise card.
                      setStepVerified(true);
                      // A wrong final answer still counts as an attempted
                      // prompt, so the learner may move on manually. Only a
                      // correct answer starts the automatic transition.
                      if (isCorrect) setAutoAdvanceRequested(true);
                    }
                  }}
                  onAttemptDeferred={({ isFinalExercise }) => {
                    if (isReviewSession || reviewMistake || !isFinalExercise) return;
                    // The incorrect attempt is already stored server-side and
                    // remains in My Mistakes. “Later” only advances the
                    // learner; it never changes the result or awards XP.
                    setStepVerified(true);
                    setAutoAdvanceRequested(true);
                  }}
                  onSpacedReviewCorrect={(difficulty) => {
                    triggerSuccessEffect(shouldBurstLessonConfetti({ isCorrect: true, difficulty }));
                  }}
                  onSpacedReviewComplete={() => {
                    setStepVerified(true);
                    setAutoAdvanceRequested(true);
                  }}
                />
              </div>
            </article>

            {reviewReturnPending ? <footer className={styles.footer}><p className={styles.footerNote} role="status">Mistake fixed. Returning to your review list…</p></footer> : null}
            {!reviewReturnPending && isReviewSession ? <footer className={styles.footer}><p className={styles.footerNote} role="status">Correct every saved answer in this lesson to continue your review.</p></footer> : null}
            {!reviewReturnPending && !isReviewSession && isInteractiveStep && !stepVerified ? <footer className={styles.footer}><p className={styles.footerNote}>Answer every exercise in this block to unlock the next step.</p></footer> : null}
          </section>
          </LessonWordHoverDictionary>
        )}

        {saveError ? <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p> : null}
        {reviewError ? <p role="alert" className={styles.reviewError}>{reviewError}</p> : null}
        {!previewMode && !canSaveProgress ? <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">You are trying a real lesson. Sign in after the preview to save this step and continue from the same place.</p> : null}
      </div>
    </main>
  );
}
