import type { SupportedLocale } from "./locale";

/**
 * The short answer status is deliberately shared by every learner-facing
 * exercise. Keeping it here prevents a lesson, vocabulary review, or the
 * placement test from drifting back to technical "Correct" messages.
 */
export type LearnerAnswerFeedback = {
  wellDone: string;
  correctAnswer: string;
  xpAwarded: (experience: number) => string;
};

const ANSWER_FEEDBACK: Record<SupportedLocale, Omit<LearnerAnswerFeedback, "xpAwarded">> = {
  en: { wellDone: "Well done!", correctAnswer: "Correct answer:" },
  ru: { wellDone: "Отлично!", correctAnswer: "Правильный ответ:" },
  uk: { wellDone: "Чудово!", correctAnswer: "Правильна відповідь:" },
};

function displayExperience(experience: number) {
  const amount = Number.isFinite(experience) ? Math.max(0, experience) : 0;
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
}

export function learnerAnswerFeedback(locale: SupportedLocale): LearnerAnswerFeedback {
  return {
    ...ANSWER_FEEDBACK[locale],
    xpAwarded: (experience) => `+${displayExperience(experience)} XP`,
  };
}
