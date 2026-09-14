import { normalizeWord } from "./normalize-word";

export type PronunciationAssessment = {
  normalizedTarget: string;
  normalizedTranscript: string;
  similarity: number;
  verdict: "MATCH" | "CLOSE" | "RETRY";
};

/**
 * Prepares a browser speech-recognition transcript for a forgiving comparison.
 * This intentionally does not alter the dictionary spelling used elsewhere.
 */
export function normalizePronunciationText(value: string) {
  return normalizeWord(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9'\-\s]/g, " ")
    .replace(/[\-']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function similarity(left: string, right: string) {
  const longest = Math.max(left.length, right.length);
  return longest ? 1 - levenshteinDistance(left, right) / longest : 0;
}

/**
 * Classifies recognition feedback without turning it into a scored answer.
 * Short words require an exact transcript because a near match is often another word.
 */
export function assessPronunciation(target: string, transcript: string): PronunciationAssessment {
  const normalizedTarget = normalizePronunciationText(target);
  const normalizedTranscript = normalizePronunciationText(transcript);
  const score = similarity(normalizedTarget, normalizedTranscript);
  const isExact = Boolean(normalizedTarget) && normalizedTarget === normalizedTranscript;
  const closeThreshold = normalizedTarget.replace(/\s/g, "").length <= 4 ? 0.92 : normalizedTarget.includes(" ") ? 0.82 : 0.86;

  return {
    normalizedTarget,
    normalizedTranscript,
    similarity: score,
    verdict: isExact ? "MATCH" : score >= closeThreshold ? "CLOSE" : "RETRY",
  };
}
