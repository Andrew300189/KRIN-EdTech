import { domainToUnicode } from "node:url";

/**
 * A deliberately conservative, editable identity filter. It covers common
 * explicit insults, slurs and vulgar terms in English, German, Polish,
 * Ukrainian and Russian, including frequent romanized and obfuscated forms.
 * No finite word list can cover every expression; avoid broad three-letter
 * substring rules that would reject ordinary surnames and place names.
 */
const FORBIDDEN_STEMS = [
  // English and widely used internet spellings.
  "fuck", "fck", "shit", "bitch", "asshole", "dumbass", "motherfucker",
  "cocksuck", "dickhead", "whore", "slut", "wanker", "twat", "pussy",
  "dildo", "bastard", "bugger", "bollocks", "arsehole", "douchebag",
  "jerkoff", "knobhead", "nigger", "nigga", "faggot", "retard",
  // German (ß and accented spellings are folded below).
  "scheiss", "scheis", "arschloch", "fick", "fotz", "wichs",
  "hurensohn", "schlamp", "nutte", "dummkopf", "trottel", "kacke",
  "pisser", "schwuchtel", "missgeburt",
  // Polish, including forms shared with neighbouring languages.
  "kurw", "krwa", "skurw", "pierdol", "pierdal", "spierdal", "chuj", "huj", "jeb", "dziwk",
  "kutas", "szmat", "cipa", "pizd", "gowno",
  // Russian and Ukrainian stems; short ambiguous forms are exact-only below.
  "хуй", "хуя", "хуе", "хуи", "пизд", "ебат", "ебан", "ебал", "ебл",
  "ебуч", "ебну", "заеб", "наеб", "уеб", "йоб", "иба", "ибл", "бля",
  "шлюх", "мудак", "мудач", "говн", "дерьм", "ублюд", "пидор",
  "пидар", "пидр", "срак", "сран", "жоп", "похер", "херня", "херов",
  "залуп", "гандон", "дроч", "отсос", "шльондр", "дебил", "идиот", "кретин",
  // Common Latin spellings of Cyrillic profanity.
  "blyat", "blyad", "pizd", "mudak", "pidor", "shlyuh", "govno",
  "huy", "hui", "yob", "yeb", "ebat", "zhopa", "zalup", "gandon",
  // Explicit sexual or hateful identity labels.
  "pornhub", "pornstar", "sexshop", "boobs", "sextoy",
] as const;

/** These terms must stand alone; substring checks would reject real names. */
const FORBIDDEN_WHOLE_WORDS = new Set([
  "ass", "cock", "dick", "cunt", "cum", "sex", "sexy", "porn", "porno",
  "xxx", "piss", "crap", "nude", "penis", "vagina", "tits", "rape",
  "idiot", "moron", "loser", "stupid", "prick", "suka", "dupa", "ciota",
  "hure", "debil", "idiota", "glupi", "чмо", "сука", "сучка",
  "лох", "урод", "тварь", "педик", "даун", "падла", "мразь", "ебу", "ибу",
]);

const LATIN_FOLD: Record<string, string> = {
  "ß": "ss", "ł": "l", "ı": "i", "æ": "ae", "œ": "oe", "ø": "o",
  "а": "а", "ё": "е", "і": "и", "ї": "и", "є": "е", "ґ": "г",
};
const VISUAL_CYRILLIC: Record<string, string> = {
  a: "а", b: "в", c: "с", e: "е", h: "н", i: "и", k: "к",
  m: "м", o: "о", p: "р", t: "т", x: "х", y: "у",
  "@": "а", "!": "и", "$": "с",
  "0": "о", "1": "и", "3": "з", "4": "ч", "5": "с", "6": "б", "7": "т", "8": "в",
};
const VISUAL_LATIN: Record<string, string> = {
  "а": "a", "в": "b", "е": "e", "і": "i", "и": "i", "к": "k",
  "м": "m", "н": "h", "о": "o", "р": "p", "с": "c", "т": "t",
  "у": "u", "х": "x", "υ": "u", "ο": "o", "κ": "k", "α": "a",
  "@": "a", "!": "i", "$": "s",
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
};
const CYRILLIC_TO_LATIN: Record<string, string> = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ж": "zh",
  "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
  "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
  "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ы": "y",
  "э": "e", "ю": "yu", "я": "ya", "ь": "", "ъ": "",
};

function replaceCharacters(value: string, table: Record<string, string>) {
  return [...value].map((character) => table[character] ?? character).join("");
}

function baseText(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase()
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .normalize("NFD")
    .replace(/и\u0306/g, "й");
  return replaceCharacters(
    normalized.replace(/[\u0300-\u036f]/g, "").normalize("NFC"),
    LATIN_FOLD,
  );
}

function variants(value: string) {
  const base = baseText(value);
  const latin = replaceCharacters(base, VISUAL_LATIN);
  const phonetic = replaceCharacters(base, CYRILLIC_TO_LATIN);
  const cyrillic = /[а-яіїєґ]/u.test(base) ? replaceCharacters(base, VISUAL_CYRILLIC) : "";
  return [base, latin, phonetic, cyrillic].filter(Boolean);
}

function containsForbiddenTerm(value: string) {
  for (const variant of variants(value)) {
    const words = variant.match(/[\p{L}\p{N}]+/gu) ?? [];
    const compact = words.join("");
    // Also catch deliberate letter stretching, without changing the stored id.
    const compactForms = [compact, compact.replace(/(.)\1{2,}/gu, "$1"), compact.replace(/(.)\1+/gu, "$1")];
    if (words.some((word) => FORBIDDEN_WHOLE_WORDS.has(word))) return true;
    for (const form of compactForms) {
      if (FORBIDDEN_WHOLE_WORDS.has(form)) return true;
      if (FORBIDDEN_STEMS.some((stem) => form.includes(stem))) return true;
    }
  }
  return false;
}

export function hasDisallowedAccountLanguage(value: string, field: "name" | "username" | "email") {
  if (field !== "email") return containsForbiddenTerm(value);

  const at = value.lastIndexOf("@");
  if (at < 0) return containsForbiddenTerm(value);
  const localPart = value.slice(0, at);
  const domain = value.slice(at + 1);
  let decodedLocalPart = localPart;
  try { decodedLocalPart = decodeURIComponent(localPart); } catch { /* Invalid encoding is validated elsewhere. */ }
  return containsForbiddenTerm(decodedLocalPart) || domain.split(".").some((label) => containsForbiddenTerm(domainToUnicode(label) || label));
}
