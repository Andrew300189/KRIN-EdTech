import { BAG_STAGES_PER_BLOCK, BAG_STORY_PLAN_VERSION, isBagStorySettings } from "./a-bag-story-plan";

/** A browser may request block completion, but only the persisted engine
 * cursor proves that all five cards of that block were reached. */
export function verifiedBagStoryBlockIds(blocks: Array<{ id: string; settings: unknown }>, stageIndex: number, sessionCompleted: boolean) {
  const bagBlocks = blocks.filter((block) => isBagStorySettings(block.settings));
  const revised = bagBlocks.some((block) => isBagStorySettings(block.settings) && Number(block.settings.version) >= BAG_STORY_PLAN_VERSION);
  if (!revised) return sessionCompleted ? bagBlocks.map((block) => block.id) : [];
  return bagBlocks.filter((block) => {
    if (!isBagStorySettings(block.settings)) return false;
    if (block.settings.practiceKind === "CURATED_STORY") {
      const start = Number(block.settings.stageStart);
      const count = Number(block.settings.stageCount);
      return Number.isInteger(start) && start >= 0 && Number.isInteger(count) && count > 0 && stageIndex >= start + count;
    }
    const partIndex = Number(block.settings.partIndex);
    const configuredSpan = Number(block.settings.stagesPerBlock);
    const stageSpan = Number.isInteger(configuredSpan) && configuredSpan >= 1 && configuredSpan <= BAG_STAGES_PER_BLOCK ? configuredSpan : BAG_STAGES_PER_BLOCK;
    return Number.isInteger(partIndex) && partIndex >= 0 && stageIndex >= (partIndex + 1) * stageSpan;
  }).map((block) => block.id);
}
