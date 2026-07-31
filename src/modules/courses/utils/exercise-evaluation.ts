type JsonRecord = Record<string, unknown>;

function getAnswerOptions(content: unknown): JsonRecord {
  if (!content || typeof content !== "object" || Array.isArray(content)) return {};
  return content as JsonRecord;
}

function normalizeText(value: string, options: JsonRecord) {
  const collapsed = options.ignoreExtraSpaces === false
    ? value.trim()
    : value.trim().replace(/\s+/g, " ");
  const punctuationAware = options.ignorePunctuation === true
    ? collapsed.replace(/[.,!?;:()[\]{}'"`-]/g, "")
    : collapsed;
  return options.caseSensitive === true ? punctuationAware : punctuationAware.toLocaleLowerCase("en");
}

export function canonicalExerciseAnswer(value: unknown, options: JsonRecord = {}): string {
  if (typeof value === "string") return normalizeText(value, options);
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => canonicalExerciseAnswer(item, options)).sort());
  if (value && typeof value === "object") {
    return JSON.stringify(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalExerciseAnswer(item, options)]),
    );
  }
  return JSON.stringify(value);
}

export function answerMatches(
  submitted: unknown,
  correct: unknown,
  alternatives: unknown,
  content: unknown,
) {
  const options = getAnswerOptions(content);
  const normalizedSubmitted = canonicalExerciseAnswer(submitted, options);
  const acceptedAnswers = Array.isArray(options.acceptedAnswers) ? options.acceptedAnswers : [];
  const candidates = [correct, ...(Array.isArray(alternatives) ? alternatives : []), ...acceptedAnswers];
  return candidates.some((candidate) => canonicalExerciseAnswer(candidate, options) === normalizedSubmitted);
}
