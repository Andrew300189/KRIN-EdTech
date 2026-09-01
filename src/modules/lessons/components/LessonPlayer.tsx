"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { LessonVocabularyPanel } from "@/modules/vocabulary/components/LessonVocabularyPanel";
import { LessonWordHoverDictionary } from "@/modules/vocabulary/components/LessonWordHoverDictionary";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { ExperienceStatus } from "@/modules/motivation/components/ExperienceStatus";
import { LessonXpBadge } from "@/modules/motivation/components/LessonXpBadge";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { CourseCompletionReview } from "@/modules/courses/components/CourseCompletionReview";
import { LessonBlockRenderer } from "./LessonBlockRenderer";
import { asObject, asStringArray, type LessonBlock } from "./lesson-content";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";
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
  attemptedExerciseIds: ReadonlySet<string>,
) {
  if (completedBlockIds.includes(block.id)) return 1;
  if (block.exercises.length === 0) return 0;
  return block.exercises.filter((exercise) => attemptedExerciseIds.has(exercise.id)).length / block.exercises.length;
}

export function LessonPlayer({
  lessonId, courseSlug, moduleTitle, title, estimatedDuration, objectives, blocks, lessons,
  currentSlug, canSaveProgress, vocabulary = [], warmUpSessionId, warmUpRequired = false,
  autoUnlockNextLesson = true, isFirstCourseLesson = false, previewMode = false, returnHref, lessonHrefPrefix,
  reviewMistake, reviewSession,
}: Props) {
  const router = useRouter();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const reviewTargetExerciseId = reviewMistake?.exerciseId ?? reviewSession?.initialExerciseId;
  const reviewBlockId = blocks.find((block) => block.exercises.some((exercise) => exercise.id === reviewTargetExerciseId))?.id ?? null;
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(reviewBlockId ?? blocks[0]?.id ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [storedProgress, setStoredProgress] = useState<StoredProgress | null>(null);
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
  const hasGuestPreviewRef = useRef(false);
  const isPracticeRunRef = useRef(false);
  const previewCompleteReported = useRef(false);
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const reviewReturnTimerRef = useRef<number | null>(null);
  const reviewReturnStartedRef = useRef(false);
  const reviewAdvanceStartedRef = useRef(false);
  const advanceStepRef = useRef<() => void>(() => undefined);

  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const objectiveItems = asStringArray(objectives);
  const activeIndex = Math.max(0, blocks.findIndex((block) => block.id === currentBlockId));
  const activeBlock = blocks[activeIndex] ?? null;
  const isFinalBlock = Boolean(activeBlock && activeIndex === blocks.length - 1);
  const isReviewSession = Boolean(reviewSession);
  const reviewDialogOpen = Boolean(reviewIntroOpen || reviewTransition || reviewComplete);
  const activeTheory = activeBlock?.type === "EXERCISE" ? exerciseTheory(activeBlock) : null;
  const isInteractiveStep = Boolean(activeBlock?.type === "EXERCISE" && activeBlock.exercises.length);
  const lessonIsCompleted = storedProgress?.status === "COMPLETED";
  const canAdvance = Boolean(activeBlock && (lessonIsCompleted || !isInteractiveStep || stepVerified || completedBlocks.includes(activeBlock.id)));
  const attemptedExerciseIds = useMemo(() => new Set(visitExerciseIds), [visitExerciseIds]);
  const progressPercent = useMemo(() => {
    if (blocks.length === 0) return 0;

    // A completed lesson keeps its historical 100% status. A new or resumed
    // lesson fills each large step according to its individual answers.
    if (lessonIsCompleted && !isPracticeRunRef.current) return 100;
    const visitedBlocks = isPracticeRunRef.current ? practiceBlockIds : completedBlocks;
    const completedFraction = blocks.reduce(
      (total, block) => total + getBlockProgressFraction(block, visitedBlocks, attemptedExerciseIds),
      0,
    );
    return Math.round((completedFraction / blocks.length) * 100);
  }, [attemptedExerciseIds, blocks, completedBlocks, lessonIsCompleted, practiceBlockIds]);
  const progressLabel = lessonIsCompleted
    ? `Practice · ${progressPercent}% revisited`
    : `${progressPercent}% complete`;
  const hasUnfinishedRequiredBlocks = useMemo(
    () => blocks.some((block) => block.isRequired && !completedBlocks.includes(block.id)),
    [blocks, completedBlocks],
  );
  const guestPreviewKey = `krin:lesson-preview:${lessonId}`;
  const destination = reviewSession ? "/student/mistakes" : (returnHref ?? `/courses/${courseSlug}`);

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
    if (previewMode || !canSaveProgress || isReviewSession) return;
    let live = true;
    void fetch(`/api/learning/lessons/${lessonId}/progress`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { data?: StoredProgress | null } | null) => {
        if (!live || !payload?.data || hasGuestPreviewRef.current) return;
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
          // Start a practice visit at the first step, while retaining the
          // persisted completed steps. This lets the learner review freely
          // without showing a misleading 0% progress state or re-locking
          // the rest of a finished lesson.
          isPracticeRunRef.current = true;
          setPracticeBlockIds([]);
          // Keep historical answer colours, while a new practice pass starts
          // at 0% and grows only from answers made in this visit.
          setVisitExerciseIds((current) => current);
          setCompletedBlocks(restoredBlocks);
          setCurrentBlockId(blocks[0]?.id ?? null);
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
      .catch(() => undefined);
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
    const timer = window.setInterval(heartbeat, 30_000);
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
    setStepVerified(Boolean(activeBlock && (!isInteractiveStep || completedBlocks.includes(activeBlock.id))));
  }, [activeBlock, completedBlocks, isInteractiveStep]);

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

  async function persistProgress(complete = false, snapshot?: { completed: string[]; current: string | null }) {
    if (previewMode || !canSaveProgress || isReviewSession) return null;
    const savedCompleted = snapshot?.completed ?? completedBlocks;
    const savedCurrent = snapshot?.current ?? currentBlockId;
    setSaveError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedBlockIds: savedCompleted, currentBlockId: savedCurrent, activeSeconds: 0, complete }),
    });
    const payload = await response.json() as { data?: StoredProgress; error?: string };
    if (!response.ok || !payload.data) {
      setSaveError(payload.error ?? "Unable to save your progress.");
      return null;
    }
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
    if (previewMode || !canSaveProgress || isReviewSession || elapsedSeconds === 0 || elapsedSeconds % 30 !== 0) return;
    void persistProgress();
  // Saving happens at the clock boundary, not every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, canSaveProgress, isReviewSession, previewMode]);

  async function advanceStep() {
    if (!activeBlock || !canAdvance) return;
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
      await persistProgress(false, { completed: nextCompleted, current: nextBlock.id });
      return;
    }

    // Timeline navigation stays open: a learner may leave an incorrect or
    // skipped task behind without being redirected to an unrelated block.
    const firstIncompleteRequiredBlock = blocks.find((block) => block.isRequired && !nextCompleted.includes(block.id));
    if (firstIncompleteRequiredBlock) {
      await persistProgress(false, { completed: nextCompleted, current: activeBlock.id });
      setFinished(true);
      return;
    }

    const saved = await persistProgress(true, { completed: nextCompleted, current: activeBlock.id });
    if (canSaveProgress && !saved) return;
    if (!previewMode && !canSaveProgress && !previewCompleteReported.current) {
      previewCompleteReported.current = true;
      reportFunnelEvent("PREVIEW_LESSON_COMPLETE");
    }
    if (saved?.status === "COMPLETED" && autoUnlockNextLesson && nextLesson && !isPracticeRunRef.current) {
      router.push(`${lessonHrefPrefix ?? `/courses/${courseSlug}/lessons`}/${nextLesson.slug}`);
      return;
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
    void persistProgress(false, { completed: completedBlocks, current: previousBlock.id });
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

  return (
    <main className={styles.player}>
      <RewardNotification events={rewardEvents} />
      {!isReviewSession && activeBlock ? (
        <nav className={styles.sideNavigation} aria-label="Lesson step navigation">
          <button
            type="button"
            className={`${styles.sideNavigationButton} ${styles.sideNavigationPrevious}`}
            disabled={activeIndex === 0}
            onClick={goToPreviousBlock}
            aria-label="Previous lesson step"
            title="Previous step"
          >
            <img src="/icons/lesson-next.svg" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.sideNavigationButton} ${styles.sideNavigationNext} ${isFinalBlock ? styles.sideNavigationFinish : ""}`}
            disabled={!canAdvance}
            onClick={() => void advanceStep()}
            aria-label={isFinalBlock ? "Finish lesson" : "Next lesson step"}
            title={isFinalBlock ? "Finish lesson" : "Next step"}
          >
            {isFinalBlock ? <span>Finish</span> : <img src="/icons/lesson-next.svg" alt="" aria-hidden="true" />}
          </button>
        </nav>
      ) : null}
      <div className={styles.frame}>
        <header className={styles.header} aria-label="Lesson controls">
          <div className={styles.headerNavigation}>
            <button type="button" className={styles.closeLink} onClick={() => void leaveLesson()} aria-label="Save progress and exit lesson">Save & exit</button>
            {!previewMode ? <button type="button" className={styles.backToCourseLink} onClick={() => void openCourseContent()} aria-label="Save progress and open course content">Back to course</button> : null}
          </div>
          <div className={styles.progress} aria-label={`Lesson progress: ${progressLabel}`}>
            <div className={styles.progressMeta}><span>{progressLabel}</span><span>{previewMode ? "Preview" : `Active ${formattedTime}`}</span></div>
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
                const label = block.title?.trim() || `${block.type.replace(/_/g, " ")} step`;
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
                    className={`${styles.blockSegment} ${isReviewableAfterCompletion || isCompleted ? styles.blockSegmentCompleted : ""} ${isCurrent ? styles.blockSegmentCurrent : ""}`}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${label}. ${state}. Latest result: ${performance}.${canOpenBlock ? " Open this step." : " Complete the current step first."}`}
                    style={attemptVisual?.style}
                    title={`${index + 1}. ${label}`}
                    disabled={!canOpenBlock}
                    onClick={() => {
                      if (!canOpenBlock) return;
                      setAutoAdvanceRequested(false);
                      setCurrentBlockId(block.id);
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
          <p>{moduleTitle} · {estimatedDuration ? `${estimatedDuration} min` : "Self-paced"}{storedProgress ? ` · Score ${storedProgress.score}` : ""}</p>
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
          <section className={styles.completion} aria-live="polite">
            <p className={styles.taskType}>{hasUnfinishedRequiredBlocks ? "Session saved" : "Lesson complete"}</p>
            <h2>Great work — your progress is saved.</h2>
            <p>{previewMode ? "This was a protected preview. Return to the editor to continue creating the lesson." : "Continue with your course whenever you are ready."}</p>
            {!previewMode && lessonReward?.awarded ? <div className={styles.lessonReward}><LessonXpBadge experience={lessonReward.experience} correctAnswers={Object.values(exerciseResults).filter(Boolean).length} incorrectAnswers={Object.values(exerciseResults).filter((value) => !value).length} progressPercent={100} /><p>First-completion reward: +{lessonReward.experience} XP{lessonReward.coins ? ` · +${lessonReward.coins} coins` : ""}</p></div> : null}
            {!previewMode && !lessonReward?.awarded && isPracticeRunRef.current ? <p className={styles.lessonReward}>Practice complete. XP is awarded only for the first completion.</p> : null}
            {!previewMode && lessonReward && !lessonReward.awarded && !isPracticeRunRef.current ? <p className={styles.lessonReward}>Lesson complete. No XP was added under the current reward rule.</p> : null}
            {!previewMode && canSaveProgress ? <CourseCompletionReview courseSlug={courseSlug} active={finished && !hasUnfinishedRequiredBlocks} /> : null}
            <div className={styles.completionActions}>
              <button type="button" className={styles.finishButton} onClick={() => router.push(destination)}>{previewMode ? "Back to editor" : "Back to course"}</button>
              {!previewMode && !hasUnfinishedRequiredBlocks && nextLesson ? <button type="button" className={styles.nextLessonButton} onClick={() => router.push(`${lessonHrefPrefix ?? `/courses/${courseSlug}/lessons`}/${nextLesson.slug}`)}>Next lesson</button> : null}
              {!previewMode && canSaveProgress && hasUnresolvedMistakes ? <button type="button" className={styles.reviewAllButton} disabled={startingAllMistakesReview} onClick={() => void startAllMistakesReview()}>{startingAllMistakesReview ? "Preparing review…" : "Fix all mistakes"}</button> : null}
            </div>
          </section>
        ) : !activeBlock ? (
          <section className={styles.empty}><h2>No lesson steps yet</h2><p>Add content blocks in the lesson editor to build the learner flow.</p></section>
        ) : (
          <LessonWordHoverDictionary sourceLessonId={lessonId} words={vocabulary}>
          <section className={`${styles.workspace} ${reviewDialogOpen ? styles.workspacePaused : ""}`} aria-label="Current lesson step" aria-hidden={reviewDialogOpen}>
            {!previewMode && vocabulary.length > 0 ? <LessonVocabularyPanel lessonId={lessonId} words={vocabulary} /> : null}
            {activeTheory ? (
              <section className={styles.theory}>
                <button type="button" className={styles.theoryToggle} onClick={() => setTheoryCollapsed((value) => !value)} aria-expanded={!theoryCollapsed}>
                  <span><span className={styles.theoryEyebrow}>Theory for this step</span><span className={styles.theoryTitle}>Use this explanation while you practise</span></span>
                  <span>{theoryCollapsed ? "Show theory" : "Hide theory"}</span>
                </button>
                <div className={`${styles.theoryPanel} ${theoryCollapsed ? styles.theoryPanelCollapsed : ""}`}><div className={styles.theoryInner}><p className={styles.theoryText}>{activeTheory}</p></div></div>
              </section>
            ) : null}

            <article className={`${styles.taskCard} ${activeBlock.type === "EXERCISE" ? styles.exerciseTaskCard : ""} ${activeBlock.type !== "EXERCISE" ? styles.readingTaskCard : ""} ${activeBlock.type === "THEORY" ? styles.theoryTaskCard : ""}`}>
              {activeBlock.type !== "EXERCISE" && activeBlock.type !== "INTRO" ? <div className={styles.taskTopline}>
                <span className={styles.taskType}>{activeBlock.type.replace(/_/g, " ")}</span>
                {activeBlock.isRequired ? <span className={styles.required}>Required step</span> : null}
              </div> : null}
              <div className={styles.lessonGoalTop}>
                <span className={styles.lessonGoalTopLabel}>Цель урока</span>
                <p>{learnerGoalForBlock(activeBlock) ?? objectiveItems[0] ?? "Take one focused step at a time."}</p>
              </div>
              <div className={styles.focusContent} key={activeBlock.id}>
                <LessonBlockRenderer
                  block={activeBlock}
                  completed={completedBlocks.includes(activeBlock.id)}
                  onToggleComplete={() => undefined}
                  canSaveProgress={false}
                  previewMode={previewMode}
                  hideHeader
                  playerStyle
                  hideExerciseTheoryText={Boolean(activeTheory)}
                  focusExerciseId={reviewMistake?.exerciseId ?? reviewSession?.initialExerciseId}
                  individualExerciseStep={activeBlock.type === "EXERCISE"}
                  mistakeExerciseIds={activeBlock.exercises
                    .filter((exercise) => exerciseResults[exercise.id] === false)
                    .map((exercise) => exercise.id)}
                  requireCorrectForNext={isReviewSession || Boolean(reviewMistake)}
                  reviewRunId={reviewSession?.runId}
                  onAttemptResolved={({ exerciseId, isCorrect, isFinalExercise }) => {
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
