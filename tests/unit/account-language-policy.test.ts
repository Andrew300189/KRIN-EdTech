import { domainToASCII } from "node:url";
import { hasDisallowedAccountLanguage } from "@/core/server/account-language-policy";

describe("account identity language policy", () => {
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
