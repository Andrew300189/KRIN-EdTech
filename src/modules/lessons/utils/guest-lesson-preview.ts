import { asVocabularyMasterySettings, vocabularyMasteryStageCount } from "@/modules/vocabulary/utils/course-vocabulary-mastery";

type PreviewBlock = {
  id: string;
  type: string;
  exercises: unknown[];
  settings?: unknown;
};

function positiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Guest access is intentionally measured in learner actions, not screen
 * height. A block with ten questions must not consume the same preview share
 * as a one-line reading card.
 */
export function guestPreviewUnitsForBlock(block: PreviewBlock) {
  const mastery = block.type === "VOCABULARY" ? asVocabularyMasterySettings(block.settings) : null;
  if (mastery) {
    const newWordCount = positiveInteger(mastery.newWordCount, 1);
    const cumulativeWordCount = positiveInteger(mastery.cumulativeWordCount, newWordCount);
    return vocabularyMasteryStageCount(newWordCount, cumulativeWordCount);
  }
  return block.type === "EXERCISE" ? Math.max(1, block.exercises.length) : 1;
}

export type GuestLessonPreviewPlan = {
  totalUnits: number;
  freeUnits: number;
  /** The ordered number of actions a guest can complete in each block. */
  allowedUnitsByBlockId: Record<string, number>;
};

/** Grants the first half of every published lesson, always allowing at least
 * one meaningful action. Remaining actions are protected by the common
 * account wall, regardless of course or lesson type. */
export function buildGuestLessonPreviewPlan(blocks: PreviewBlock[]): GuestLessonPreviewPlan {
  const units = blocks.map((block) => ({ id: block.id, count: guestPreviewUnitsForBlock(block) }));
  const totalUnits = units.reduce((total, item) => total + item.count, 0);
  const freeUnits = totalUnits ? Math.max(1, Math.ceil(totalUnits / 2)) : 0;
  let remaining = freeUnits;
  const allowedUnitsByBlockId: Record<string, number> = {};

  for (const item of units) {
    const allowed = Math.min(item.count, remaining);
    allowedUnitsByBlockId[item.id] = allowed;
    remaining -= allowed;
  }

  return { totalUnits, freeUnits, allowedUnitsByBlockId };
}
