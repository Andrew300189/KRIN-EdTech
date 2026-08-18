/** Language authoring fields deliberately accept words and punctuation only. */
export function sanitizeLanguageValue(value: string): string {
  return value.replace(/[0-9]/g, "");
}

export function splitLanguageLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => sanitizeLanguageValue(item).trim())
    .filter(Boolean);
}

export function preventNumericKey(event: { key: string; preventDefault: () => void }) {
  if (/^[0-9]$/.test(event.key)) event.preventDefault();
}
