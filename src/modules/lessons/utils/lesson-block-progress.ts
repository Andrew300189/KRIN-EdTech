type ProgressBlock = {
  id: string;
  exerciseIds: readonly string[];
  isBagStory: boolean;
};

type BagStoryProgress = { blockId: string; completedStages: number; totalStages: number } | null;

/** One fraction per visible lesson block. The header segments and percentage
 * must always be derived from the same values. */
export function lessonBlockProgressFractions(
  blocks: readonly ProgressBlock[],
  completedBlockIds: readonly string[],
  attemptedExerciseIds: ReadonlySet<string>,
  bagStoryProgress: BagStoryProgress,
  forceComplete = false,
): number[] {
  const completed = new Set(completedBlockIds);
  return blocks.map((block) => {
    if (forceComplete || completed.has(block.id)) return 1;
    if (block.isBagStory && bagStoryProgress?.blockId === block.id && bagStoryProgress.totalStages > 0) {
      return Math.max(0, Math.min(1, bagStoryProgress.completedStages / bagStoryProgress.totalStages));
    }
    if (!block.exerciseIds.length) return 0;
    const attempted = block.exerciseIds.filter((id) => attemptedExerciseIds.has(id)).length;
    return attempted / block.exerciseIds.length;
  });
}

export function lessonProgressPercent(blockFractions: readonly number[]): number {
  if (!blockFractions.length) return 0;
  return Math.round(blockFractions.reduce((sum, fraction) => sum + fraction, 0) / blockFractions.length * 100);
}
