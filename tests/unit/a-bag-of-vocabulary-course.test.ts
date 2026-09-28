import { execFileSync } from "node:child_process";
import path from "node:path";
import { BAG_CARD_ORDER, BAG_CHUNK_STAGE_SPAN, bagQuickCheckEligible, bagStoryStageCount, buildBagStoryStages, buildBagReviewStages, bagStory, bagRecallExperience, bagStageExperience } from "@/modules/vocabulary/utils/a-bag-story-plan";

describe("A bag of food vocabulary course", () => {
  it("validates six five-phrase lessons and a final review of all thirty", () => {
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
      lessons: 7,
      blocks: 36,
      translations: { uk: 30, ru: 30 },
    });
    expect(result.stageCounts).toEqual([...Array.from({ length: 6 }, () => bagStoryStageCount(5)), 30]);
    expect(result.exercises).toBe(result.stageCounts.reduce((sum, count) => sum + count, 0));
  });

  it("uses five varied cards per phrase and short review blocks", () => {
    expect(BAG_CARD_ORDER).toEqual(["P", "CE", "TL", "S", "TE"]);
    const stages = buildBagStoryStages(["rice", "flour", "apples", "carrots", "oranges"]);
    expect(stages).toHaveLength(25);
    expect(stages.map((stage) => stage.wordOrdinal)).toEqual([0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4]);
    expect(stages.filter((stage) => stage.kind === "BAG_SENTENCE_ASSEMBLE")).toHaveLength(5);
    expect(buildBagReviewStages(Array.from({ length: 30 }, (_, index) => String(index)))).toHaveLength(30);
    expect(buildBagStoryStages(["rice"], ["a bag of rice"], 2)).toHaveLength(377);
    expect(buildBagReviewStages(Array.from({ length: 30 }, (_, index) => String(index)), 2)).toHaveLength(120);
    expect(bagStory("a bag of rice", "пакет рису", "uk")[9]?.english).toBe("We use a bag of rice for dinner.");
    expect(bagStory("a bag of flour", "пакет борошна", "uk")[9]?.english).toBe("We use a bag of flour for a cake.");
    expect(bagStory("a bag of apples", "пакет яблук", "uk")[8]?.local).toBe("Ми ділимося пакетом яблук.");
    for (const [english, ukrainian, russian] of [
      ["a bag of rice", "пакет рису", "пакет риса"],
      ["a bag of flour", "пакет борошна", "пакет муки"],
      ["a bag of apples", "пакет яблук", "пакет яблок"],
      ["a bag of carrots", "пакет моркви", "пакет моркови"],
      ["a bag of oranges", "пакет апельсинів", "пакет апельсинов"],
    ]) {
      expect(bagStory(english, ukrainian, "uk").reduce((sum, line) => sum + line.chunks.length, 0)).toBe(15);
      expect(bagStory(english, russian, "ru")).toHaveLength(10);
    }
    expect(bagRecallExperience(10, 1)).toBe(14.5);
    const choice = stages.find((stage) => stage.code === "CE")!;
    const typed = stages.find((stage) => stage.code === "TL")!;
    const phraseSpeech = stages[0]!;
    expect(bagStageExperience(choice, 1)).toBeLessThan(bagStageExperience(typed, 1));
    expect(bagStageExperience(typed, 1)).toBeLessThan(bagStageExperience(phraseSpeech, 1));
  });

  it("keeps old chunk-check sessions readable during the published upgrade", () => {
    const stages = buildBagStoryStages(["rice", "flour"], ["a bag of rice", "a bag of flour"], 2);
    const firstFlourNeed = stages.findIndex((stage) => stage.wordOrdinal === 1 && stage.kind === "BAG_CHUNK" && stage.storyIndex === 1 && stage.chunkCode === "INTRO");
    const check = stages[firstFlourNeed]!;
    expect(bagQuickCheckEligible(check, "I need", ["i need"], [])).toBe(true);
    expect(bagQuickCheckEligible(check, "I need", ["i need"], [check.key])).toBe(false);
    expect(stages[firstFlourNeed + BAG_CHUNK_STAGE_SPAN]?.kind).toBe("BAG_SENTENCE_ASSEMBLE");
  });
});
