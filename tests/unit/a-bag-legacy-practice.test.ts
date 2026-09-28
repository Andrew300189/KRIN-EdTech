import { execFileSync } from "node:child_process";
import path from "node:path";
import { BAG_LEGACY_PRACTICE_ROUNDS, BAG_LEGACY_REVIEW_ROUNDS, buildBagLegacyPracticeStages, buildBagReviewStages, buildBagStoryStages } from "@/modules/vocabulary/utils/a-bag-story-plan";

describe("A bag of legacy cards redistributed as short lessons", () => {
  const ids = ["rice", "flour", "apples", "carrots", "oranges"];
  const phrases = ids.map((word) => `a bag of ${word}`);

  it("validates 461 required short lessons without touching the database", () => {
    const importer = path.join(process.cwd(), "database/scripts/import-a-bag-legacy-practice.cjs");
    const plan = JSON.parse(execFileSync(process.execPath, [importer, "--validate"], { encoding: "utf8" }).trim());
    expect(plan).toMatchObject({ status: "valid", additionalLessons: 461, additionalModules: 7, additionalBlocks: 2304, additionalExercises: 11430 });
  });

  it("keeps all 1,885 original phrase stages exactly once across 76 lessons", () => {
    const original = buildBagStoryStages(ids, phrases, 2);
    const rounds = Array.from({ length: BAG_LEGACY_PRACTICE_ROUNDS }, (_, round) => buildBagLegacyPracticeStages(ids, phrases, round));
    expect(rounds.slice(0, -1).every((stages) => stages.length === 25)).toBe(true);
    expect(rounds.at(-1)).toHaveLength(10);
    expect(rounds.flat().map((stage) => stage.key).sort()).toEqual(original.map((stage) => stage.key).sort());
    expect(rounds[0]?.slice(0, 5).every((stage) => stage.wordOrdinal === 0)).toBe(true);
    expect(rounds[0]?.slice(5, 10).every((stage) => stage.wordOrdinal === 1)).toBe(true);
  });

  it("keeps all 120 old review stages in five short lessons", () => {
    const reviewIds = Array.from({ length: 30 }, (_, index) => `word-${index}`);
    const rounds = Array.from({ length: BAG_LEGACY_REVIEW_ROUNDS }, (_, round) => buildBagLegacyPracticeStages(reviewIds, [], round, true));
    expect(rounds.map((stages) => stages.length)).toEqual([25, 25, 25, 25, 20]);
    expect(rounds.flat().map((stage) => stage.key)).toEqual(buildBagReviewStages(reviewIds, 2).map((stage) => stage.key));
  });
});
