"use client";

import { useEffect, useRef, useState } from "react";
import { ExerciseRenderer } from "../ExerciseRenderer";
import { type LessonBlock } from "../lesson-content";
import placementStyles from "@/modules/courses/components/PlacementTest.module.css";

type ExerciseBlockProps = {
  block: LessonBlock;
  completed?: boolean;
  previewMode?: boolean;
  playerStyle?: boolean;
  hideContext?: boolean;
  hideContextText?: boolean;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; isFinalExercise: boolean }) => void;
};

export function ExerciseBlock({ block, completed = false, previewMode = false, playerStyle = false, hideContext = false, hideContextText = false, onAttemptResolved }: ExerciseBlockProps) {
  const exercises = block.exercises;
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIndexes, setCompletedIndexes] = useState<number[]>([]);
  const [allExercisesUnlocked, setAllExercisesUnlocked] = useState(completed);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const activeExercise = exercises[activeIndex] ?? null;
  const isLastExercise = activeIndex === exercises.length - 1;
  const activeExerciseComplete = completedIndexes.includes(activeIndex);

  useEffect(() => {
    setActiveIndex(0);
    setCompletedIndexes(completed ? exercises.map((_, index) => index) : []);
    setAllExercisesUnlocked(completed);
    setShowAllExercises(false);
  }, [block.id, completed, exercises]);

  useEffect(() => () => {
    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
  }, []);

  if (!exercises.length) return <p className="mt-4 text-sm text-slate-500">Exercises for this block are being prepared.</p>;

  function resolveAttempt(index: number, exerciseId: string, isCorrect: boolean) {
    onAttemptResolved?.({
      exerciseId,
      isCorrect,
      isFinalExercise: isCorrect && index === exercises.length - 1,
    });
    if (!isCorrect) {
      return;
    }

    const nextCompleted = completedIndexes.includes(index) ? completedIndexes : [...completedIndexes, index];
    setCompletedIndexes(nextCompleted);
    if (index === exercises.length - 1) {
      setAllExercisesUnlocked(true);
      return;
    }

    if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
    // Keep the confirmation visible long enough to be understood, then move
    // on without making the learner press the same button after every answer.
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      setActiveIndex((currentIndex) => currentIndex === index ? Math.min(index + 1, exercises.length - 1) : currentIndex);
      autoAdvanceTimerRef.current = null;
    }, 1_250);
  }

  if (playerStyle) return (
    <div data-lesson-exercise-player>
      <div className={placementStyles.ptHeader}>
        <span className={placementStyles.ptBadge}><span className={placementStyles.ptBadgeDot} />Exercise</span>
        <div className="flex items-center gap-3">
          <span className={placementStyles.ptCounter}>Exercise <strong className={placementStyles.ptCounterBold}>{showAllExercises ? exercises.length : activeIndex + 1}</strong> of {exercises.length}</span>
          {allExercisesUnlocked ? <button type="button" onClick={() => setShowAllExercises((value) => !value)} className={`${placementStyles.ptBtn} ${placementStyles.ptBtnGhost}`}>{showAllExercises ? "Return to the last exercise" : "View all"}</button> : null}
        </div>
      </div>
      <div className={placementStyles.ptBody}>
        <div className={placementStyles.ptQuestion}>
          {showAllExercises ? (
            <div className="space-y-4" aria-label="All completed exercises">
              {exercises.map((exercise) => <ExerciseRenderer key={exercise.id} exercise={exercise} previewMode={previewMode} hideContext={hideContext} hideContextText={hideContextText} onAttemptResolved={({ exerciseId, isCorrect }) => onAttemptResolved?.({ exerciseId, isCorrect, isFinalExercise: false })} />)}
            </div>
          ) : activeExercise ? (
            <>
              <ExerciseRenderer key={activeExercise.id} exercise={activeExercise} previewMode={previewMode} hideContext={hideContext} hideContextText={hideContextText} onAttemptResolved={({ exerciseId, isCorrect }) => resolveAttempt(activeIndex, exerciseId, isCorrect)} />
              {activeExerciseComplete && !isLastExercise ? <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">Correct. The next exercise opens automatically.</p> : null}
              {activeExerciseComplete && isLastExercise ? <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">All exercises in this step are complete.</p> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Exercise {showAllExercises ? `${exercises.length} of ${exercises.length}` : `${activeIndex + 1} of ${exercises.length}`}</p>
          <p className="mt-0.5 text-sm text-slate-600">Complete this exercise before the next one opens.</p>
        </div>
        {allExercisesUnlocked ? <button type="button" onClick={() => setShowAllExercises((value) => !value)} className="rounded-full border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{showAllExercises ? "Return to the last exercise" : "View all exercises"}</button> : null}
      </div>

      {showAllExercises ? (
        <div className="space-y-4" aria-label="All completed exercises">
          {exercises.map((exercise) => <ExerciseRenderer key={exercise.id} exercise={exercise} previewMode={previewMode} hideContext={hideContext} hideContextText={hideContextText} onAttemptResolved={({ exerciseId, isCorrect }) => onAttemptResolved?.({ exerciseId, isCorrect, isFinalExercise: false })} />)}
        </div>
      ) : activeExercise ? (
        <>
          <ExerciseRenderer key={activeExercise.id} exercise={activeExercise} previewMode={previewMode} hideContext={hideContext} hideContextText={hideContextText} onAttemptResolved={({ exerciseId, isCorrect }) => resolveAttempt(activeIndex, exerciseId, isCorrect)} />
          {activeExerciseComplete && !isLastExercise ? <p className="text-sm font-semibold text-emerald-700" role="status">Correct — the next exercise opens automatically.</p> : null}
          {activeExerciseComplete && isLastExercise ? <p className="text-sm font-semibold text-emerald-700" role="status">All exercises in this step are complete. The lesson continues automatically.</p> : null}
        </>
      ) : null}
    </div>
  );
}
