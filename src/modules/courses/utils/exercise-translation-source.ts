type JsonRecord = Record<string, unknown>;

export type ExerciseTranslationTarget = {
  /** Text the learner can actually see and needs help understanding. */
  source: string;
  /**
   * Old CMS content sometimes stores an explanation of the exercise in the
   * generic `translation` field. That is not a translation of a matching
   * prompt, so it must never replace the learner-facing phrase.
   */
  canUseAuthoredTranslation: boolean;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function firstText(values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function toBeForm(value: string) {
  return /^(am|is|are)(?:\s*[—–-]\s*|$)/iu.test(value.trim());
}

/**
 * Select the text a learner sees, rather than an authoring note. Compact
 * `to be` matching cards display the value from `content.left` as the prompt;
 * their `question`, `source` and stored `translation` can be the editor's
 * explanation of the matching mechanic instead.
 */
export function getExerciseTranslationTarget(input: { question?: string | null; content: unknown }): ExerciseTranslationTarget {
  const content = record(input.content);
  const matchingLeft = strings(content.left);
  const matchingRight = strings(content.right);
  const isCompactToBeMatching = matchingLeft.length > 0
    && matchingRight.length > 0
    && matchingRight.every(toBeForm);

  if (isCompactToBeMatching) {
    return {
      source: matchingLeft.join("\n"),
      canUseAuthoredTranslation: false,
    };
  }

  return {
    source: firstText([input.question, content.authoringSource, content.source]),
    canUseAuthoredTranslation: true,
  };
}

export function getAuthoredExerciseTranslation(contentInput: unknown, target: ExerciseTranslationTarget) {
  if (!target.canUseAuthoredTranslation) return null;
  const content = record(contentInput);
  // `translation`, `translationRu` and `translatedText` were historically
  // overloaded in the CMS. They can contain a rule, a writer's note or a
  // translation of another part of the card. Never show those values to a
  // learner as the answer to “show translation”. Authors can intentionally
  // supply a vetted prompt translation through one of these explicit fields.
  return firstText([content.learnerTranslation, content.promptTranslation]) || null;
}
