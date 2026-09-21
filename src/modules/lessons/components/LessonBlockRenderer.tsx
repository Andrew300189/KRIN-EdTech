"use client";

import { ExerciseBlock } from "./blocks/ExerciseBlock";
import { HomeworkBlock } from "./blocks/HomeworkBlock";
import { MediaBlock } from "./blocks/MediaBlock";
import { TextBlock } from "./blocks/TextBlock";
import { VocabularyBlock } from "./blocks/VocabularyBlock";
import { SpacedReviewBlock } from "./blocks/SpacedReviewBlock";
import { CourseVocabularyMasteryBlock } from "@/modules/vocabulary/components/CourseVocabularyMasteryBlock";
import type { LessonBlock } from "./lesson-content";
import { isSpacedReviewSettings } from "@/modules/lessons/utils/spaced-review";
import { asVocabularyMasterySettings } from "@/modules/vocabulary/utils/course-vocabulary-mastery";

type LessonBlockRendererProps = {
  lessonId: string;
  block: LessonBlock;
  contentLocale?: "ru" | "uk";
  persistentStreakTone?: string | null;
  canSaveProgress: boolean;
  previewMode?: boolean;
  hideHeader?: boolean;
  playerStyle?: boolean;
  hideExerciseContext?: boolean;
  hideExerciseTheoryText?: boolean;
  focusExerciseId?: string;
  individualExerciseStep?: boolean;
  mistakeExerciseIds?: string[];
  attemptedExerciseIds?: string[];
  progressHydrated?: boolean;
  requireCorrectForNext?: boolean;
  reviewRunId?: string;
  vocabularyWords?: Array<{ wordId: string; word: { lemma: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null; meanings: Array<{ translation: string | null; definition: string }> } }>;
  guestActionLimit?: number;
  guestResumeExerciseIndex?: number;
  guestCompletedExerciseCount?: number;
  onGuestLimitReached?: (resumeStageIndex?: number) => void;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; isFinalExercise: boolean; difficulty?: number; streakTone?: string | null; streakMilestone?: number | null }) => void;
  onAttemptDeferred?: (result: { exerciseId: string; isFinalExercise: boolean }) => void;
  onSpacedReviewCorrect?: (difficulty?: number) => void;
  onSpacedReviewIncorrect?: () => void;
  onSpacedReviewComplete?: () => void;
  onStreakChestAvailable?: (milestone: number) => void;
  onVocabularyMasteryStageComplete?: (result: { exerciseId: string; streakTone?: string | null; streakMilestone?: number | null }) => void;
  onVocabularyMasteryComplete?: () => void;
};

export function LessonBlockRenderer({
  lessonId,
  block,
  contentLocale,
  persistentStreakTone,
  canSaveProgress,
  previewMode = false,
  hideHeader = false,
  playerStyle = false,
  hideExerciseContext = false,
  hideExerciseTheoryText = false,
  focusExerciseId,
  individualExerciseStep = false,
  mistakeExerciseIds,
  attemptedExerciseIds,
  progressHydrated,
  requireCorrectForNext = false,
  reviewRunId,
  vocabularyWords = [],
  guestActionLimit,
  guestResumeExerciseIndex,
  guestCompletedExerciseCount,
  onGuestLimitReached,
  onAttemptResolved,
  onAttemptDeferred,
  onSpacedReviewCorrect,
  onSpacedReviewIncorrect,
  onSpacedReviewComplete,
  onStreakChestAvailable,
  onVocabularyMasteryStageComplete,
  onVocabularyMasteryComplete,
}: LessonBlockRendererProps) {
  const isExercise = block.type === "EXERCISE";
  const isSpacedReview = block.type === "REVIEW" && isSpacedReviewSettings(block.settings);
  const isVocabulary = block.type === "VOCABULARY" || block.type === "PHRASE_OF_THE_DAY";
  const isVocabularyMastery = block.type === "VOCABULARY" && Boolean(asVocabularyMasterySettings(block.settings));
  const isMedia = block.type === "VIDEO" || block.type === "AUDIO" || block.type === "IMAGE" || block.type === "LISTENING";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!hideHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{block.type.replace(/_/g, " ")}</p>
            {block.title ? <h2 className="mt-1 text-2xl font-bold text-slate-900">{block.title}</h2> : null}
          </div>
          {block.isRequired ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Required</span> : null}
        </div>
      ) : null}

      {isSpacedReview ? (
        <SpacedReviewBlock lessonId={lessonId} block={block} contentLocale={contentLocale} previewMode={previewMode || !canSaveProgress} playerStyle={playerStyle} onCorrectAnswer={onSpacedReviewCorrect} onIncorrectAnswer={onSpacedReviewIncorrect} onStreakChestAvailable={onStreakChestAvailable} onReviewComplete={() => onSpacedReviewComplete?.()} />
      ) : isExercise ? (
        <ExerciseBlock block={block} contentLocale={contentLocale} persistentStreakTone={persistentStreakTone} previewMode={previewMode || !canSaveProgress} playerStyle={playerStyle} hideContext={hideExerciseContext} hideContextText={hideExerciseTheoryText} focusExerciseId={focusExerciseId} individualExerciseStep={individualExerciseStep} mistakeExerciseIds={mistakeExerciseIds} attemptedExerciseIds={attemptedExerciseIds} progressHydrated={progressHydrated} requireCorrectForNext={requireCorrectForNext} reviewRunId={reviewRunId} guestExerciseLimit={guestActionLimit} guestResumeExerciseIndex={guestResumeExerciseIndex} guestCompletedExerciseCount={guestCompletedExerciseCount} onGuestLimitReached={(resumeIndex) => onGuestLimitReached?.(resumeIndex)} onAttemptResolved={onAttemptResolved} onAttemptDeferred={onAttemptDeferred} />
      ) : isVocabularyMastery ? (
        <CourseVocabularyMasteryBlock lessonId={lessonId} canSaveProgress={canSaveProgress && !previewMode} contentLocale={contentLocale} settings={block.settings} introWords={vocabularyWords} guestStageLimit={guestActionLimit} onGuestLimitReached={(resumeIndex) => onGuestLimitReached?.(resumeIndex)} onStageComplete={onVocabularyMasteryStageComplete} onComplete={onVocabularyMasteryComplete} />
      ) : block.type === "HOMEWORK" ? (
        <HomeworkBlock block={block} canSaveProgress={canSaveProgress} />
      ) : isVocabulary ? (
        <VocabularyBlock block={block} />
      ) : isMedia ? (
        <MediaBlock block={block} />
      ) : (
        <TextBlock block={block} />
      )}
    </section>
  );
}
