/** The same compact answer vocabulary is used by the lesson UI and its
 * server-side validator. A stored matching option may include a full example
 * after a dash, while the learner only needs to enter the verb form. */
const FORM = "(?:am not|is not|are not|isn't|aren't|am|is|are)";
const fullOptionPattern = new RegExp(`^(${FORM})(?:\\s*[—–-]\\s*.+)?$`, "iu");
const compactInputPattern = new RegExp(`^(${FORM})$`, "iu");

function canonicalForm(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/’/gu, "'");
}

export function toBeMatchingForm(value: unknown) {
  if (typeof value !== "string") return null;
  const match = canonicalForm(value).match(fullOptionPattern);
  return match?.[1] ?? null;
}

export function compactToBeMatchingInput(value: unknown) {
  if (typeof value !== "string") return null;
  const match = canonicalForm(value).match(compactInputPattern);
  return match?.[1] ?? null;
}

/** Keep the first-module behaviour for am/is/are and extend it to negative
 * forms in later modules without module-specific exercise components. */
export function compactToBeMatchingForms(rightOptions: readonly string[]) {
  if (!rightOptions.length) return null;
  const forms = rightOptions.map(toBeMatchingForm);
  if (forms.some((form) => !form)) return null;
  return [...new Set(forms as string[])];
}
