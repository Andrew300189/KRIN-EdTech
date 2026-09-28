import type { KeyboardEvent } from "react";

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

const englishSymbolKeys: Record<string, string> = {
  BracketLeft: "[{", BracketRight: "]}", Semicolon: ";:", Quote: "'\"", Comma: ",<", Period: ".>",
};

/** Browser code cannot switch the OS layout. Map the physical key only when
 * its emitted character is in the wrong alphabet, leaving correct typing,
 * paste, shortcuts and IME composition untouched. */
export function characterForWrongAnswerLayout(language: AnswerInputLanguage, key: string, code: string, shiftKey = false) {
  if (key.length !== 1) return null;
  const wrongAlphabet = language === "en"
    ? /[\p{Script=Cyrillic}]/u.test(key)
    : /[A-Za-z]/u.test(key)
      || Boolean(englishSymbolKeys[code]?.includes(key))
      || (language === "uk" ? /[ыэъё]/iu.test(key) : /[іїєґ]/iu.test(key));
  if (!wrongAlphabet && !(language === "uk" && (code === "Backslash" || code === "IntlBackslash") && "\\|".includes(key))) return null;
  if (language === "uk" && (code === "Backslash" || code === "IntlBackslash")) return shiftKey || key !== key.toLocaleLowerCase() ? "Ґ" : "ґ";
  for (let row = 0; row < keyboardRows.length; row += 1) {
    const index = keyboardRows[row].indexOf(code as never);
    if (index < 0) continue;
    const mapped = characters[language][row]?.[index];
    if (!mapped) return null;
    const uppercase = shiftKey || (key === key.toLocaleUpperCase() && key !== key.toLocaleLowerCase());
    return uppercase ? mapped.toLocaleUpperCase() : mapped;
  }
  return null;
}

/** Keep a controlled answer input in the lesson's expected alphabet without
 * changing the learner's OS layout. Correct-layout typing and IME stay native. */
export function applyAnswerKeyboardLayout<T extends HTMLInputElement | HTMLTextAreaElement>(
  event: KeyboardEvent<T>, language: AnswerInputLanguage, onValue: (value: string) => void,
) {
  if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
  const replacement = characterForWrongAnswerLayout(language, event.key, event.code, event.shiftKey);
  if (!replacement) return false;
  event.preventDefault();
  const field = event.currentTarget;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  onValue(`${field.value.slice(0, start)}${replacement}${field.value.slice(end)}`);
  window.requestAnimationFrame(() => {
    if (document.activeElement === field) field.setSelectionRange(start + replacement.length, start + replacement.length);
  });
  return true;
}
