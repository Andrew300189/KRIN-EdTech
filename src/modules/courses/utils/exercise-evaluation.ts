type JsonRecord = Record<string, unknown>;

function getAnswerOptions(content: unknown): JsonRecord {
  if (!content || typeof content !== "object" || Array.isArray(content)) return {};
  return content as JsonRecord;
}

/**
 * Ordering engines are the exception to the normal array comparison rule:
 * their answer is a sentence, so the sequence is the answer.  Older CMS
 * records did not persist `preserveOrder`, therefore the rule must also live
 * beside evaluation rather than relying on every historical JSON payload.
 */
const ORDER_SENSITIVE_ENGINE_KEYS = new Set([
  "sentence-builder",
  "sorting",
  "drag-and-drop",
]);

export function contentWithOrderSensitiveAnswerValidation(
  content: unknown,
  engineKey: string | null | undefined,
): JsonRecord | unknown {
  if (!ORDER_SENSITIVE_ENGINE_KEYS.has(engineKey?.trim().toLowerCase() ?? "")) {
    return content;
  }

  return { ...getAnswerOptions(content), preserveOrder: true };
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
  if (Array.isArray(value)) {
    const values = value.map((item) => canonicalExerciseAnswer(item, options));
    return JSON.stringify(options.preserveOrder === true ? values : values.sort());
  }
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

/**
 * Legacy matching records keep the full right-hand sentence as their answer,
 * while the current learner UI asks for just `am`, `is` or `are`. Convert only
 * an exact compact form back to the stored canonical value before evaluation.
 * Every other answer is left untouched and remains incorrect as it should.
 */
export function normalizeCompactToBeMatchingAnswer(
  answer: unknown,
  correctAnswer: unknown,
  engineKey: string | null | undefined,
): unknown {
  if (engineKey?.trim().toLowerCase() !== "matching") return answer;
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return answer;
  if (!correctAnswer || typeof correctAnswer !== "object" || Array.isArray(correctAnswer)) return answer;

  const submitted = answer as JsonRecord;
  const expected = correctAnswer as JsonRecord;
  const formFromValue = (value: unknown) => {
    if (typeof value !== "string") return null;
    const matched = value.trim().match(/^(am|is|are)(?:\s*[—–-]\s*|$)/i);
    return matched?.[1]?.toLowerCase() ?? null;
  };

  let changed = false;
  const normalized = Object.fromEntries(Object.entries(submitted).map(([key, submittedValue]) => {
    const expectedValue = expected[key];
    const submittedForm = formFromValue(submittedValue);
    const expectedForm = formFromValue(expectedValue);
    if (submittedForm && expectedForm && submittedForm === expectedForm) {
      changed = true;
      return [key, expectedValue];
    }
    return [key, submittedValue];
  }));

  return changed ? normalized : answer;
}
