/** Normalizes spelling without conflating separate lemmas. */
export function normalizeWord(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}
