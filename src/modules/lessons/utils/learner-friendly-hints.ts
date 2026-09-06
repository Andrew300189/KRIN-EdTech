type ToBeExercise = {
  engineKey: string;
  question: string;
  instruction: string;
  hint: string | null;
  content: unknown;
};

const russianHints = {
  matching: "Сначала найди в фразе I, he, she, it, we, you или they. Потом выбери форму: I — am; he, she, it — is; we, you, they — are.",
  order: "Сложи фразу так: кто? → am/is/are → остальные слова.",
  correction: "Прочитай фразу. Найди форму am, is или are, которая не подходит, и исправь только её.",
  thereIsAre: "Посчитай предметы: один — there is, много — there are.",
  negative: "Сначала выбери am, is или are. Потом поставь not после этой формы.",
  question: "В вопросе am, is или are стоит перед словом I, you, he, she, it, we или they.",
  default: "Сначала найди, кто в предложении: I — am; he, she, it — is; we, you, they — are.",
} as const;

const ukrainianHints = {
  matching: "Спочатку знайди у фразі I, he, she, it, we, you або they. Потім обери форму: I — am; he, she, it — is; we, you, they — are.",
  order: "Склади фразу так: хто? → am/is/are → решта слів.",
  correction: "Прочитай фразу. Знайди форму am, is або are, яка не підходить, і виправ лише її.",
  thereIsAre: "Порахуй предмети: один — there is, багато — there are.",
  negative: "Спочатку обери am, is або are. Потім постав not після цієї форми.",
  question: "У запитанні am, is або are стоїть перед словом I, you, he, she, it, we або they.",
  default: "Спочатку знайди, хто в реченні: I — am; he, she, it — is; we, you, they — are.",
} as const;

function looksLikeToBeExercise(exercise: ToBeExercise) {
  const visibleCopy = [exercise.question, exercise.instruction, exercise.hint].filter(Boolean).join(" ");
  if (/\b(?:to be|am|is|are|isn't|aren't|am not|there is|there are)\b/i.test(visibleCopy)) return true;
  if (!exercise.content || typeof exercise.content !== "object" || Array.isArray(exercise.content)) return false;
  const options = (exercise.content as Record<string, unknown>).options;
  return Array.isArray(options) && options.some((option) => typeof option === "string" && /^(?:am|is|are|isn't|aren't|am not)$/i.test(option.trim()));
}

/** Replaces dense, author-written To Be hints with one short learning step. */
export function learnerFriendlyHint(exercise: ToBeExercise, locale: string) {
  if (!exercise.hint || (locale !== "ru" && locale !== "uk") || !looksLikeToBeExercise(exercise)) return exercise.hint;
  const hint = locale === "uk" ? ukrainianHints : russianHints;
  const source = `${exercise.question} ${exercise.instruction} ${exercise.hint}`.toLowerCase();

  if (/there\s+(?:is|are)|\bthere\b/.test(source)) return hint.thereIsAre;
  if (exercise.engineKey === "sentence-builder" || exercise.engineKey === "drag-and-drop" || /соберите|зберіть|build the sentence/.test(source)) return hint.order;
  if (exercise.engineKey === "find-and-correct" || /ошиб|помилк|correct the wrong/.test(source)) return hint.correction;
  if (/\bnot\b|n't|отрицан|запереч/.test(source)) return hint.negative;
  if (/\?|\b(?:who|what|where|how old)\b|вопрос|запитан/.test(source)) return hint.question;
  if (exercise.engineKey === "matching" || /сопостав|зістав|match/.test(source)) return hint.matching;
  return hint.default;
}
