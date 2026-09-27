export type AnswerInputLanguage = "en" | "ru" | "uk";

const keyboardRows = [
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period"],
] as const;

const characters: Record<AnswerInputLanguage, readonly string[]> = {
  en: ["qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,."],
  ru: ["йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"],
  uk: ["йцукенгшщзхї", "фівапролджє", "ячсмитьбю"],
};

/** Browser code cannot switch the OS layout. Map the physical key only when
 * its emitted character is in the wrong alphabet, leaving correct typing,
 * paste, shortcuts and IME composition untouched. */
export function characterForWrongAnswerLayout(language: AnswerInputLanguage, key: string, code: string) {
  if (key.length !== 1) return null;
  const wrongAlphabet = language === "en" ? /[\p{Script=Cyrillic}]/u : /[A-Za-z]/u;
  if (!wrongAlphabet.test(key)) return null;
  if (language === "uk" && (code === "Backslash" || code === "IntlBackslash")) return key === key.toLocaleUpperCase() ? "Ґ" : "ґ";
  for (let row = 0; row < keyboardRows.length; row += 1) {
    const index = keyboardRows[row].indexOf(code as never);
    if (index < 0) continue;
    const mapped = characters[language][row]?.[index];
    if (!mapped) return null;
    return key === key.toLocaleUpperCase() && key !== key.toLocaleLowerCase() ? mapped.toLocaleUpperCase() : mapped;
  }
  return null;
}
