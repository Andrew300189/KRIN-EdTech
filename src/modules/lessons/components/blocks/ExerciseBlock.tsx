"use client";

import { useEffect, useRef, useState } from "react";
import { ExerciseRenderer } from "../ExerciseRenderer";
import { type LessonBlock } from "../lesson-content";
import placementStyles from "@/modules/courses/components/PlacementTest.module.css";
import styles from "./ExerciseBlock.module.css";

type ExerciseBlockProps = {
  block: LessonBlock;
  completed?: boolean;
  previewMode?: boolean;
  playerStyle?: boolean;
  hideContext?: boolean;
  hideContextText?: boolean;
  focusExerciseId?: string;
  /** Use question-focused copy in the compact lesson player. */
  individualExerciseStep?: boolean;
  /** Exercise ids whose latest saved attempt is incorrect. */
  mistakeExerciseIds?: string[];
  /** Saved attempts let a returning learner resume inside this block. */
  attemptedExerciseIds?: string[];
  /** Do not restore the saved position until the lesson snapshot is loaded. */
  progressHydrated?: boolean;
  requireCorrectForNext?: boolean;
  /** A system review deliberately keeps retrieval practice one question at a time. */
  sequentialOnly?: boolean;
  reviewRunId?: string;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; isFinalExercise: boolean }) => void;
  onAttemptDeferred?: (result: { exerciseId: string; isFinalExercise: boolean }) => void;
};

export function ExerciseBlock({ block, previewMode = false, playerStyle = false, hideContext = false, hideContextText = false, focusExerciseId, individualExerciseStep = false, mistakeExerciseIds = [], attemptedExerciseIds = [], progressHydrated = false, requireCorrectForNext = false, sequentialOnly = false, reviewRunId, onAttemptResolved, onAttemptDeferred }: ExerciseBlockProps) {
  const exercises = block.exercises;
  const focusedExerciseIndex = Math.max(0, focusExerciseId ? exercises.findIndex((exercise) => exercise.id === focusExerciseId) : 0);
  const [activeIndex, setActiveIndex] = useState(focusedExerciseIndex);
  const [answeredIndexes, setAnsweredIndexes] = useState<number[]>([]);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoredBlockRef = useRef<string | null>(null);
  const activeExercise = exercises[activeIndex] ?? null;
  const isLastExercise = activeIndex === exercises.length - 1;
  const activeExerciseAnswered = answeredIndexes.includes(activeIndex);
  const mistakeIndexes = mistakeExerciseIds
    .map((exerciseId) => exercises.findIndex((exercise) => exercise.id === exerciseId))
    .filter((index) => index >= 0);
  const canShowAllExercises = exercises.length > 1 && !reviewRunId && !sequentialOnly;
  const canFixMistakes = mistakeIndexes.length > 0 && !reviewRunId && !sequentialOnly;

  useEffect(() => {
    if (!progressHydrated || restoredBlockRef.current === block.id) return;
    restoredBlockRef.current = block.id;

    const attempted = new Set(attemptedExerciseIds);
    const attemptedIndexes = exercises
      .map((exercise, index) => attempted.has(exercise.id) ? index : -1)
      .filter((index) => index >= 0);
    const firstUnattemptedIndex = exercises.findIndex((exercise) => !attempted.has(exercise.id));

    setAnsweredIndexes(attemptedIndexes);
    setShowAllExercises(false);
    setActiveIndex(focusExerciseId
      ? focusedExerciseIndex
      : firstUnattemptedIndex >= 0
        ? firstUnattemptedIndex
        : Math.max(0, exercises.length - 1));
  }, [attemptedExerciseIds, block.id, exercises, focusExerciseId, focusedExerciseIndex, progressHydrated]);

  useEffect(() => () => {
    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (!showAllExercises) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setShowAllExercises(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => modalCloseButtonRef.current?.focus());
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAllExercises]);

  if (!exercises.length) return <p className="mt-4 text-sm text-slate-500">Exercises for this block are being prepared.</p>;

  function openNextExercise(index: number) {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setActiveIndex((currentIndex) => currentIndex === index
      ? Math.min(index + 1, exercises.length - 1)
      : currentIndex);
  }

  function focusFirstMistake() {
    const firstMistakeIndex = mistakeIndexes[0];
    if (firstMistakeIndex === undefined) return;
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setShowAllExercises(false);
    setActiveIndex(firstMistakeIndex);
  }

  function resolveAttempt(index: number, exerciseId: string, isCorrect: boolean) {
    onAttemptResolved?.({
      exerciseId,
      isCorrect,
      isFinalExercise: index === exercises.length - 1,
    });

    // A block is a completed learning path once every prompt has received an
    // answer. Incorrect answers remain visible in red and can be retried, but
    // do not trap the learner on the same prompt.
    // A learner can inspect all tasks before beginning. The first checked
    // answer returns the same mounted card to the focused, one-at-a-time
    // flow, so neither the typed answer nor its feedback disappears.
    if (showAllExercises) {
      setShowAllExercises(false);
      setActiveIndex(index);
    }

    // Keep an incorrect answer in view. It gets the red edge and shake, but
    // never schedules the automatic transition to the next task.
    if (!isCorrect) return;
    const nextAnswered = answeredIndexes.includes(index) ? answeredIndexes : [...answeredIndexes, index];
    setAnsweredIndexes(nextAnswered);
    if (index === exercises.length - 1) return;

    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
    // Keep the confirmation visible long enough to be understood, then move
    // on without making the learner press the same button after every answer.
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      openNextExercise(index);
    }, 1_250);
  }

  function deferExercise(index: number, exerciseId: string) {
    if (requireCorrectForNext) return;
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (showAllExercises) {
      setShowAllExercises(false);
      setActiveIndex(index);
    }
    if (index < exercises.length - 1) {
      openNextExercise(index);
      return;
    }
    onAttemptDeferred?.({ exerciseId, isFinalExercise: true });
  }

  const exerciseCards = exercises.map((exercise, index) => (
    <div key={exercise.id} data-task-index={index + 1} hidden={!showAllExercises && index !== activeIndex}>
      <ExerciseRenderer
        exercise={exercise}
        previewMode={previewMode}
        hideContext={hideContext}
        hideContextText={hideContextText}
        reviewRunId={reviewRunId}
        onAttemptResolved={({ exerciseId, isCorrect }) => resolveAttempt(index, exerciseId, isCorrect)}
        onDefer={requireCorrectForNext ? undefined : () => deferExercise(index, exercise.id)}
      />
    </div>
  ));

  const exerciseActions = (
    <div className="flex flex-wrap items-center gap-2">
      {canFixMistakes ? <button type="button" onClick={focusFirstMistake} className={`${placementStyles.ptBtn} ${placementStyles.ptBtnGhost}`}>Fix {mistakeIndexes.length} {mistakeIndexes.length === 1 ? "mistake" : "mistakes"}</button> : null}
      {canShowAllExercises ? <button type="button" onClick={() => setShowAllExercises((value) => !value)} className={`${placementStyles.ptBtn} ${placementStyles.ptBtnGhost}`}>{showAllExercises ? "Continue one by one" : "Show all tasks"}</button> : null}
    </div>
  );

  if (playerStyle) return (
    <div data-lesson-exercise-player>
      <div className={placementStyles.ptHeader}>
        <span className={placementStyles.ptBadge}><span className={placementStyles.ptBadgeDot} />{individualExerciseStep ? "Question" : "Exercise"}</span>
        <div className="flex items-center gap-3">
          <span className={placementStyles.ptCounter}>{individualExerciseStep ? "Task" : "Exercise"} <strong className={placementStyles.ptCounterBold}>{showAllExercises ? exercises.length : activeIndex + 1}</strong> of {exercises.length}</span>
          {exerciseActions}
        </div>
      </div>
      <div className={placementStyles.ptBody}>
        <div className={placementStyles.ptQuestion}>
          <div
            className={showAllExercises ? styles.modal : undefined}
            data-exercise-task-modal={showAllExercises ? "true" : undefined}
            role={showAllExercises ? "dialog" : undefined}
            aria-modal={showAllExercises || undefined}
            aria-label={showAllExercises ? "All tasks in this lesson step" : undefined}
            onMouseDown={showAllExercises ? (event) => { if (event.currentTarget === event.target) setShowAllExercises(false); } : undefined}
          >
            <div className={showAllExercises ? styles.modalPanel : undefined}>
              {showAllExercises ? <header className={styles.modalHeader}>
                <div><p className={styles.modalEyebrow}>Lesson step</p><h2>All tasks · {exercises.length}</h2><p>Choose any task to begin. Your first answer returns you to the focused learning flow.</p></div>
                <button ref={modalCloseButtonRef} type="button" className={styles.modalClose} onClick={() => setShowAllExercises(false)} aria-label="Close all tasks" title="Close">×</button>
              </header> : null}
              <div className={showAllExercises ? styles.modalTasks : undefined} aria-label={showAllExercises ? "All exercises" : undefined}>{exerciseCards}</div>
            </div>
          </div>
          {activeExercise && activeExerciseAnswered && !showAllExercises && !isLastExercise ? <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">Answer recorded. The next question opens automatically.</p> : null}
          {activeExercise && activeExerciseAnswered && !showAllExercises && isLastExercise ? <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">Answer recorded. The lesson continues automatically.</p> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Exercise {showAllExercises ? `${exercises.length} of ${exercises.length}` : `${activeIndex + 1} of ${exercises.length}`}</p>
          <p className="mt-0.5 text-sm text-slate-600">Answer this exercise before the next one opens.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFixMistakes ? <button type="button" onClick={focusFirstMistake} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">Fix {mistakeIndexes.length} {mistakeIndexes.length === 1 ? "mistake" : "mistakes"}</button> : null}
          {canShowAllExercises ? <button type="button" onClick={() => setShowAllExercises((value) => !value)} className="rounded-full border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{showAllExercises ? "Continue one by one" : "Show all exercises"}</button> : null}
        </div>
      </div>

      <div
        className={showAllExercises ? styles.modal : undefined}
        data-exercise-task-modal={showAllExercises ? "true" : undefined}
        role={showAllExercises ? "dialog" : undefined}
        aria-modal={showAllExercises || undefined}
        aria-label={showAllExercises ? "All tasks in this lesson step" : undefined}
        onMouseDown={showAllExercises ? (event) => { if (event.currentTarget === event.target) setShowAllExercises(false); } : undefined}
      >
        <div className={showAllExercises ? styles.modalPanel : undefined}>
          {showAllExercises ? <header className={styles.modalHeader}>
            <div><p className={styles.modalEyebrow}>Lesson step</p><h2>All tasks · {exercises.length}</h2><p>Choose any task to begin. Your first answer returns you to the focused learning flow.</p></div>
            <button ref={modalCloseButtonRef} type="button" className={styles.modalClose} onClick={() => setShowAllExercises(false)} aria-label="Close all tasks" title="Close">×</button>
          </header> : null}
          <div className={showAllExercises ? styles.modalTasks : undefined} aria-label={showAllExercises ? "All exercises" : undefined}>{exerciseCards}</div>
        </div>
      </div>
      {activeExercise && activeExerciseAnswered && !showAllExercises && !isLastExercise ? <p className="text-sm font-semibold text-emerald-700" role="status">Answer recorded — the next exercise opens automatically.</p> : null}
      {activeExercise && activeExerciseAnswered && !showAllExercises && isLastExercise ? <p className="text-sm font-semibold text-emerald-700" role="status">Every exercise in this step has an answer. The lesson continues automatically.</p> : null}
    </div>
  );
}
