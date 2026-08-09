import { EXERCISE_DEFINITIONS, EXERCISE_ENGINES, getExerciseDefinition, getExerciseEngine, isExerciseEngineKey, LEGACY_EXERCISE_TYPE_TO_ENGINE, resolveExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";
import { cmsBulkLifecycleSchema, cmsContentLifecycleSchema, cmsMediaAssetSchema } from "@/modules/cms/schemas/content-management.schemas";

describe("CMS exercise-engine registry", () => {
  it("uses 30 reusable engine definitions rather than one component per variation", () => {
    expect(EXERCISE_ENGINES).toHaveLength(30);
    expect(new Set(EXERCISE_ENGINES.map((engine) => engine.key)).size).toBe(30);
    expect(new Set(EXERCISE_ENGINES.map((engine) => engine.engine)).size).toBe(30);
    expect(EXERCISE_ENGINES.map((engine) => engine.engine)).toEqual(expect.arrayContaining([
      "SINGLE_CHOICE", "AI_SPEAKING_DIALOGUE", "PROJECT_ASSIGNMENT", "PERSONAL_ERROR_REVIEW",
    ]));
  });

  it("maps all existing exercise types to a supported engine", () => {
    for (const [legacyType, engineKey] of Object.entries(LEGACY_EXERCISE_TYPE_TO_ENGINE)) {
      expect(getExerciseEngine(engineKey)).not.toBeNull();
      expect(resolveExerciseEngineKey(undefined, legacyType as keyof typeof LEGACY_EXERCISE_TYPE_TO_ENGINE)).toBe(engineKey);
    }
  });

  it("accepts only registered engine keys", () => {
    expect(isExerciseEngineKey("matching")).toBe(true);
    expect(isExerciseEngineKey("choice")).toBe(true); // legacy published content remains readable
    expect(isExerciseEngineKey("invent-a-new-component")).toBe(false);
  });

  it("uses methodical subtypes instead of multiplying technical engines", () => {
    const selectionSubtypes = EXERCISE_DEFINITIONS
      .filter((definition) => definition.engine === "SINGLE_CHOICE")
      .map((definition) => definition.subtype);
    expect(selectionSubtypes).toEqual(expect.arrayContaining([
      "ARTICLE_SELECTION", "PREPOSITION_SELECTION", "PRONOUN_SELECTION", "SYNONYM_SELECTION",
      "ANTONYM_SELECTION", "TRANSLATION_SELECTION", "CONTEXT_SELECTION",
    ]));
    expect(getExerciseDefinition("single-choice", "ARTICLE_SELECTION")?.title).toBe("Article selection");
    expect(getExerciseDefinition("choice", "ARTICLE_SELECTION")?.engine).toBe("SINGLE_CHOICE");
  });
});

describe("CMS management input validation", () => {
  it("requires a date when scheduling one content item or a bulk operation", () => {
    expect(cmsContentLifecycleSchema.safeParse({ action: "SCHEDULE" }).success).toBe(false);
    expect(cmsBulkLifecycleSchema.safeParse({ action: "SCHEDULE", entityType: "COURSE", entityIds: ["clx9q1y5j0000q2v4gl4p4x2a"] }).success).toBe(false);
  });

  it("rejects non-HTTP media references", () => {
    expect(cmsMediaAssetSchema.safeParse({ kind: "IMAGE", url: "javascript:alert(1)", fileName: "unsafe", mimeType: "image/png" }).success).toBe(false);
    expect(cmsMediaAssetSchema.safeParse({ kind: "IMAGE", url: "https://cdn.example.test/image.png", fileName: "image.png", mimeType: "image/png" }).success).toBe(true);
  });
});
