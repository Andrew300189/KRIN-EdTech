import { execFileSync } from "node:child_process";
import path from "node:path";
import { vocabularyMasteryStageCount } from "@/modules/vocabulary/utils/course-vocabulary-mastery";

describe("A bag of food vocabulary course", () => {
  it("validates 30 localized phrases in three lessons with matching mastery stages", () => {
    const importer = path.join(process.cwd(), "database/scripts/import-a-bag-of-vocabulary.cjs");
    const output = execFileSync(process.execPath, [importer, "--validate"], { encoding: "utf8" });
    const result = JSON.parse(output.trim()) as {
      status: string;
      course: string;
      words: number;
      lessons: number;
      blocks: number;
      exercises: number;
      stageCounts: number[];
      translations: { uk: number; ru: number };
    };

    expect(result).toMatchObject({
      status: "valid",
      course: "a-bag-of-food-vocabulary",
      words: 30,
      lessons: 3,
      blocks: 3,
      translations: { uk: 30, ru: 30 },
    });
    expect(result.stageCounts).toEqual([
      vocabularyMasteryStageCount(12, 12),
      vocabularyMasteryStageCount(12, 24),
      vocabularyMasteryStageCount(6, 30),
    ]);
    expect(result.exercises).toBe(result.stageCounts.reduce((sum, count) => sum + count, 0));
  });
});
