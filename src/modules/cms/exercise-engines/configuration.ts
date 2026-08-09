import {
  getExerciseDefinitions,
  getExerciseEngine,
  isExerciseEngineKey,
} from "@/modules/cms/exercise-engines/registry";

export type ExerciseConfiguration = {
  type: string;
  engineKey: string;
  variantKey?: string | null;
  instruction: string;
  question: string;
  content: unknown;
  correctAnswer: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

/** Validates the configuration needed by the selected universal exercise engine. */
export function validateExerciseConfiguration(exercise: ExerciseConfiguration): string[] {
  const issues: string[] = [];
  if (!isExerciseEngineKey(exercise.engineKey) || !getExerciseEngine(exercise.engineKey)) {
    issues.push("Choose a supported exercise engine.");
  }
  if (!exercise.instruction.trim()) issues.push("An exercise needs an instruction.");
  if (!exercise.question.trim()) issues.push("An exercise needs a question.");
  if (exercise.correctAnswer === undefined || exercise.correctAnswer === null) {
    issues.push("An exercise needs a correct answer.");
  }

  const availableDefinitions = getExerciseDefinitions(exercise.engineKey);
  if (exercise.variantKey && !availableDefinitions.some((definition) => definition.subtype === exercise.variantKey)) {
    issues.push("Choose a methodical subtype supported by the selected engine.");
  }

  const renderer = getExerciseEngine(exercise.engineKey)?.renderer;
  const content = asRecord(exercise.content);
  if (renderer === "choice" || renderer === "audio-choice") {
    if (stringItems(content.options).length < 2) {
      issues.push("Choice exercises need at least two options in content.options.");
    }
  }
  if (renderer === "matching") {
    if (stringItems(content.left).length === 0 || stringItems(content.right).length === 0) {
      issues.push("Matching exercises need non-empty content.left and content.right lists.");
    }
  }
  if (renderer === "ordering" && stringItems(content.options).length < 2) {
    issues.push("Ordering exercises need at least two tokens in content.options.");
  }
  return issues;
}
