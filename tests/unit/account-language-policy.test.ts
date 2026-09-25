import { domainToASCII } from "node:url";
import { EXTRA_FORBIDDEN_TERMS } from "@/core/server/account-language-extra";
import { FORBIDDEN_STEMS, FORBIDDEN_WHOLE_WORDS, hasDisallowedAccountLanguage } from "@/core/server/account-language-policy";

describe("account identity language policy", () => {
  it.each(Object.entries(EXTRA_FORBIDDEN_TERMS))("adds exactly 100 distinct new %s terms and blocks each one", (_language, terms) => {
    expect(terms).toHaveLength(100);
    expect(new Set(terms)).toHaveProperty("size", 100);
    const canonical = (term: string) => term.toLowerCase().normalize("NFD")
      .replace(/и\u0306/gu, "й")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[іїё]/gu, (letter) => letter === "ё" ? "е" : "и");
    expect(new Set(terms.map(canonical))).toHaveProperty("size", 100);
    const previousTerms = new Set<string>([...FORBIDDEN_STEMS, ...FORBIDDEN_WHOLE_WORDS]);
    for (const term of terms) {
      expect(previousTerms.has(term)).toBe(false);
      expect(hasDisallowedAccountLanguage(term, "username")).toBe(true);
      expect(hasDisallowedAccountLanguage(`learner_${term}`, "name")).toBe(true);
      expect(hasDisallowedAccountLanguage(`${term}@example.com`, "email")).toBe(true);
    }
  });

  it.each([
    ["fuck_you", "English profanity"],
    ["sh1t", "English leetspeak"],
    ["n!gger", "English slur with a symbol"],
    ["scheiße", "German profanity"],
    ["arschloch", "German insult"],
    ["kurwa", "Polish profanity"],
    ["gówno", "Polish profanity with a diacritic"],
    ["pierdalaj", "Polish inflection"],
    ["хуй", "Russian profanity"],
    ["п1зд@", "Cyrillic leetspeak"],
    ["хyй", "mixed Cyrillic and Latin"],
    ["їбати", "Ukrainian profanity"],
    ["йобаний", "Ukrainian profanity"],
    ["blyat", "romanized Cyrillic profanity"],
    ["p0rn", "vulgar term in leetspeak"],
  ])("rejects %s (%s)", (value) => {
    expect(hasDisallowedAccountLanguage(value, "username")).toBe(true);
  });

  it.each(["classroom", "assistant", "Scunthorpe", "Hancock", "Dickinson", "Middlesex", "Cumberland", "Anna Kowalska", "Иван Лебедев", "Іван Петренко", "Fukushima"]) (
    "does not reject the ordinary name %s",
    (value) => expect(hasDisallowedAccountLanguage(value, "name")).toBe(false),
  );

  it("screens the mailbox and domain labels, including internationalized domains", () => {
    expect(hasDisallowedAccountLanguage("f.u.c.k@example.com", "email")).toBe(true);
    expect(hasDisallowedAccountLanguage("ordinary@kurwa.pl", "email")).toBe(true);
    expect(hasDisallowedAccountLanguage(`ordinary@${domainToASCII("gówno.pl")}`, "email")).toBe(true);
    expect(hasDisallowedAccountLanguage("anna.smith@gmail.com", "email")).toBe(false);
    expect(hasDisallowedAccountLanguage("hancock@cocktail.example", "email")).toBe(false);
  });
});
