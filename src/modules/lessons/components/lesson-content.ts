export type JsonObject = Record<string, unknown>;

export type LessonExercise = {
  id: string;
  type: string;
  engineKey: string;
  variantKey: string | null;
  instruction: string;
  question: string;
  content: unknown;
  explanation: string | null;
  hint: string | null;
  hintsEnabled: boolean;
  basePoints: number;
  timeLimitSeconds: number | null;
  solutionCost: number;
  allowInstantCheck: boolean;
  allowExtraExercise: boolean;
};

export type LessonBlock = {
  id: string;
  type: string;
  title: string | null;
  content: unknown;
  settings?: unknown;
  isRequired: boolean;
  exercises: LessonExercise[];
};

export function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

export function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function displayContent(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(" ") || null;
  const record = asObject(value);
  for (const key of ["text", "body", "description", "content"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
}

export function displayAnswer(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return Object.entries(value as JsonObject).map(([key, item]) => `${key}: ${String(item)}`).join("; ");
  return "";
}
