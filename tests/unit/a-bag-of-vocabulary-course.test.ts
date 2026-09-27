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
      blocks: 7,
      translations: { uk: 30, ru: 30 },
    });
    expect(result.stageCounts).toEqual([...Array.from({ length: 6 }, () => bagStoryStageCount(5)), 120]);
    expect(result.exercises).toBe(result.stageCounts.reduce((sum, count) => sum + count, 0));
  });

  it("interleaves nine chunk drills with spaced phrase practice before each sentence", () => {
    expect(BAG_CARD_ORDER).toHaveLength(78);
    expect(BAG_CARD_ORDER.filter((code) => code === "S")).toHaveLength(10);
    expect(BAG_CARD_ORDER.filter((code) => code === "P")).toHaveLength(17);
    expect(BAG_CARD_ORDER.filter((code) => code === "TL")).toHaveLength(17);
    expect(BAG_CARD_ORDER.filter((code) => code === "TE")).toHaveLength(17);
    expect(BAG_CARD_ORDER.filter((code) => code === "CE" || code === "CL")).toHaveLength(17);
    const stages = buildBagStoryStages(["rice", "flour", "apples", "carrots", "oranges"]);
    expect(stages).toHaveLength(1885);
    expect(buildBagStoryStages(["rice", "flour", "apples", "carrots", "oranges"], ["a bag of rice", "a bag of flour", "a bag of apples", "a bag of carrots", "a bag of oranges"])).toHaveLength(1885);
    expect(stages.slice(4, 7).map((stage) => stage.kind)).toEqual(["BAG_CHUNK", "BAG_PHRASE", "BAG_CHUNK"]);
    expect(stages.filter((stage) => stage.kind === "BAG_RECALL").map((stage) => stage.requiredSteps).slice(0, 9)).toEqual([2,3,4,5,6,7,8,9,10]);
    expect(stages.filter((stage) => stage.kind === "BAG_CHUNK" && stage.chunkCode === "RECALL_3")).toHaveLength(75);
    expect(stages.filter((stage) => stage.kind === "BAG_SENTENCE_ASSEMBLE")).toHaveLength(50);
    expect(buildBagReviewStages(Array.from({ length: 30 }, (_, index) => String(index)))).toHaveLength(120);
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
    expect(buildBagStoryStages(["carrots"], ["a bag of carrots"]).filter((stage) => stage.kind === "BAG_CHUNK" && stage.storyIndex === 9 && stage.chunkCode === "INTRO")).toHaveLength(2);
    expect(bagRecallExperience(10, 1)).toBe(14.5);
    const choice = stages.find((stage) => stage.code === "CE")!;
    const typed = stages.find((stage) => stage.code === "TL")!;
    const phraseSpeech = stages[0]!;
    expect(bagStageExperience(choice, 1)).toBeLessThan(bagStageExperience(typed, 1));
    expect(bagStageExperience(typed, 1)).toBeLessThan(bagStageExperience(phraseSpeech, 1));
    expect(bagStageExperience(stages.find((stage) => stage.kind === "BAG_RECALL" && stage.storyIndex === 10)!, 1)).toBe(14.5);
  });

  it("checks a mastered shared chunk once and expands its full drill after a miss", () => {
    const stages = buildBagStoryStages(["rice", "flour"], ["a bag of rice", "a bag of flour"]);
    const firstFlourNeed = stages.findIndex((stage) => stage.wordOrdinal === 1 && stage.kind === "BAG_CHUNK" && stage.storyIndex === 1 && stage.chunkCode === "INTRO");
    const check = stages[firstFlourNeed]!;
    expect(bagQuickCheckEligible(check, "I need", ["i need"], [])).toBe(true);
    expect(bagQuickCheckEligible(check, "I need", ["i need"], [check.key])).toBe(false);
    expect(stages[firstFlourNeed + BAG_CHUNK_STAGE_SPAN]?.kind).toBe("BAG_SENTENCE_ASSEMBLE");
  });
});
