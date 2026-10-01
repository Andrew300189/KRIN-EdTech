import { BAG_COMPACT_STAGES_PER_MODULE, BAG_CURATED_BLOCKS_PER_LESSON, BAG_CURATED_LESSONS_PER_MODULE, BAG_CURATED_STAGES_PER_MODULE, bagCuratedBlockBounds, buildBagCompactLessonStages, buildBagCuratedLessonStages } from "@/modules/vocabulary/utils/a-bag-story-plan";
import { execFileSync } from "node:child_process";
import path from "node:path";

describe("the ten-module A bag of curriculum", () => {
  const words = ["a bag of rice", "a bag of pasta", "a bag of potatoes"];
  const ids = ["rice", "pasta", "potatoes"];

  it("publishes exactly ten modules and twenty short missions", () => {
    const script = path.join(process.cwd(), "database/scripts/rebuild-a-bag-curated-course.cjs");
    const result = JSON.parse(execFileSync(process.execPath, [script, "--validate"], { encoding: "utf8" }));
    expect(result).toMatchObject({ status: "valid", modules: 10, lessonsPerModule: 2, lessons: 20,
      blocksPerLesson: 3, blocks: 60, cardsPerModule: BAG_COMPACT_STAGES_PER_MODULE, cards: 270 });
  });

  it("keeps all thirty phrases in short recognition and contextual missions", () => {
    const lessons = [0, 1].map((index) => buildBagCompactLessonStages(ids, words, index));
    expect(lessons.map((lesson) => lesson.length)).toEqual([15, 12]);
    expect(lessons.flat()).toHaveLength(BAG_COMPACT_STAGES_PER_MODULE);
    for (const lesson of lessons) expect(new Set(lesson.map((stage) => stage.wordId))).toEqual(new Set(ids));
    expect(lessons[1]!.some((stage) => stage.kind === "BAG_SENTENCE_ASSEMBLE")).toBe(true);
    expect(lessons[1]!.some((stage) => stage.sentenceMode === "HIDDEN")).toBe(true);
  });

  it("places all 1,161 cards of each three-phrase module into ten balanced lessons", () => {
    const lessons = Array.from({ length: BAG_CURATED_LESSONS_PER_MODULE }, (_, index) => buildBagCuratedLessonStages(ids, words, index));
    const all = lessons.flat();
    expect(lessons).toHaveLength(10);
    expect(lessons.map((lesson) => lesson.length)).toEqual([116, 116, 116, 116, 116, 116, 116, 116, 116, 117]);
    expect(all).toHaveLength(BAG_CURATED_STAGES_PER_MODULE);
    expect(new Set(all.map((stage) => stage.key)).size).toBe(all.length);
    expect(all.filter((stage) => stage.key.startsWith("core-"))).toHaveLength(15);
    expect(all.filter((stage) => stage.key.startsWith("legacy-"))).toHaveLength(1131);
    expect(all.filter((stage) => stage.key.startsWith("bag-review-"))).toHaveLength(12);
    expect(all.filter((stage) => stage.key.startsWith("current-bag-review-"))).toHaveLength(3);
    for (let index = 0; index < all.length; index += 3) expect(all.slice(index, index + 3).map((stage) => stage.wordOrdinal)).toEqual([0, 1, 2]);
  });

  it("divides every lesson into twelve consecutive blocks of nine or ten cards", () => {
    for (let lessonIndex = 0; lessonIndex < 10; lessonIndex += 1) {
      const lesson = buildBagCuratedLessonStages(ids, words, lessonIndex);
      const bounds = Array.from({ length: BAG_CURATED_BLOCKS_PER_LESSON }, (_, index) => bagCuratedBlockBounds(lesson.length, index));
      expect(bounds[0]!.start).toBe(0);
      expect(bounds.at(-1)!.end).toBe(lesson.length);
      expect(bounds.every((part, index) => part.end - part.start >= 9 && part.end - part.start <= 10 && (index === 0 || part.start === bounds[index - 1]!.end))).toBe(true);
    }
  });
});
