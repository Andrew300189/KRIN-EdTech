"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { PronunciationCoach } from "@/modules/vocabulary/components/PronunciationCoach";
import { useLocale } from "@/core/i18n/locale";
import { assessPronunciation } from "@/modules/vocabulary/utils/pronunciation";
import { buildVocabularyMasteryStages, vocabularyMasteryTranslation, type VocabularyMasteryLocale } from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import styles from "./CourseVocabularyMasteryBlock.module.css";

type Direction = "SPEAK" | "EN_RU" | "RU_EN";
type IntroWord = { wordId: string; word: { lemma: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null; meanings: Array<{ translation: string | null; definition: string }> } };
type MasteryTask = { stageIndex: number; stageKey: string; direction: Direction; title: string; requiredConsecutive: number; correctInRow: number; inputLanguage: "ru" | "uk" | "en"; words: Array<{ id: string; prompt: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null }> };
type MasteryState = { completed: boolean; progress: { completedStages: number; totalStages: number; correctStages: number; incorrectAttempts: number }; task: MasteryTask | null };
type Submission = { isCorrect: boolean; stageCompleted: boolean; sessionCompleted: boolean; state: MasteryState; exerciseId: string | null; motivationReward: { awarded: boolean; experience: number; coins: number; levelUp: boolean; streak?: { tone: string | null; activated: boolean; modeStart: number | null } | null } | null };
type GuestProgress = { stageIndex: number; correctInRow: number; incorrectAttempts: number };
type GuestWord = { id: string; lemma: string; translation: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null };

const copy = {
  ru: {
    firstBlock: "Слова первого блока", start: "Начать", blockWords: "{count} слова", guest: "Гостевая практика", stages: "этапов",
    speakEyebrow: "Слушай · повторяй", speakInstruction: "Прослушайте слово и повторите его вслух. Три точных распознавания подряд откроют следующую карточку.",
    enRuEyebrow: "Английский → русский", enRuInstruction: "Введите каждый перевод правильно пять раз подряд.", enRuLabel: "Перевод на русский",
    ruEnEyebrow: "Русский → английский", ruEnInstruction: "Введите каждый английский термин правильно пять раз подряд.", ruEnLabel: "Английский термин",
    russianPlaceholder: "Введите перевод", englishPlaceholder: "Введите английский термин", keyboard: "Язык клавиатуры:", russian: "русский", english: "английский",
    check: "Проверить", checking: "Проверяем…", consecutive: "правильно подряд", correct: "Правильно.", reset: "Серия обнулилась. Проверьте термин и попробуйте ещё раз — засчитываются только правильные попытки.",
    stageDone: "Этап завершён — следующая карточка уже готова.", lessonDone: "Все слова этого урока освоены.", completedTitle: "Блок слов завершён", completedText: "Вы прошли все обязательные серии.", guestCompleted: "Гостевая практика завершена. Войдите в аккаунт, чтобы сохранять прогресс и получать XP.",
    loading: "Загружаем практику слов…", unavailable: "Практика слов недоступна.", word: "Слово", wordsTogether: "слов вместе", thisLesson: "Этот урок", mixed: "Смешанное повторение",
  },
  uk: {
    firstBlock: "Слова першого блоку", start: "Почати", blockWords: "{count} слова", guest: "Гостьова практика", stages: "етапів",
    speakEyebrow: "Слухай · повторюй", speakInstruction: "Прослухайте слово й повторіть його вголос. Три точні розпізнавання поспіль відкриють наступну картку.",
    enRuEyebrow: "Англійська → українська", enRuInstruction: "Введіть кожен переклад правильно п’ять разів поспіль.", enRuLabel: "Переклад українською",
    ruEnEyebrow: "Українська → англійська", ruEnInstruction: "Введіть кожен англійський термін правильно п’ять разів поспіль.", ruEnLabel: "Англійський термін",
    russianPlaceholder: "Введіть переклад", englishPlaceholder: "Введіть англійський термін", keyboard: "Мова клавіатури:", russian: "українська", english: "англійська",
    check: "Перевірити", checking: "Перевіряємо…", consecutive: "правильно поспіль", correct: "Правильно.", reset: "Серію скинуто. Перевірте термін і спробуйте ще раз — зараховуються лише правильні спроби.",
    stageDone: "Етап завершено — наступна картка вже готова.", lessonDone: "Усі слова цього уроку опановано.", completedTitle: "Блок слів завершено", completedText: "Ви пройшли всі обов’язкові серії.", guestCompleted: "Гостьову практику завершено. Увійдіть в акаунт, щоб зберігати прогрес і отримувати XP.",
    loading: "Завантажуємо практику слів…", unavailable: "Практика слів недоступна.", word: "Слово", wordsTogether: "слів разом", thisLesson: "Цей урок", mixed: "Змішане повторення",
  },
} as const;

function cleanAnswer(value: string) { return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " "); }
function directionCopy(direction: Direction, locale: VocabularyMasteryLocale) {
  const value = copy[locale];
  if (direction === "SPEAK") return { eyebrow: value.speakEyebrow, instruction: value.speakInstruction, inputLabel: "" };
  if (direction === "EN_RU") return { eyebrow: value.enRuEyebrow, instruction: value.enRuInstruction, inputLabel: value.enRuLabel };
  return { eyebrow: value.ruEnEyebrow, instruction: value.ruEnInstruction, inputLabel: value.ruEnLabel };
}
function localizedTaskTitle(task: MasteryTask, locale: VocabularyMasteryLocale) {
  const value = copy[locale];
  const wordOrdinal = /^Word (\d+)/.exec(task.title)?.[1];
  if (wordOrdinal) return `${value.word} ${wordOrdinal}`;
  if (task.title.includes("Mixed recall")) return value.mixed;
  if (task.title.includes("This lesson")) return value.thisLesson;
  return task.title.replace(/\d+ words together/, `${task.words.length} ${value.wordsTogether}`);
}
async function requestState(lessonId: string, locale: VocabularyMasteryLocale) {
  const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/vocabulary-mastery?locale=${locale}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: MasteryState; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to load vocabulary practice");
  return payload.data;
}

export function CourseVocabularyMasteryBlock({ lessonId, canSaveProgress = true, contentLocale, settings, introWords = [], onStageComplete, onComplete }: {
  lessonId: string; canSaveProgress?: boolean; contentLocale?: "ru" | "uk"; settings?: unknown; introWords?: IntroWord[];
  onStageComplete?: (result: { exerciseId: string; streakTone?: string | null; streakMilestone?: number | null }) => void; onComplete?: () => void;
}) {
  const { locale: selectedLocale } = useLocale();
  const locale: VocabularyMasteryLocale = contentLocale ?? (selectedLocale === "uk" ? "uk" : "ru");
  const text = copy[locale];
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<MasteryState | null>(null);
  const [guestProgress, setGuestProgress] = useState<GuestProgress>({ stageIndex: 0, correctInRow: 0, incorrectAttempts: 0 });
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const completedSignalled = useRef(false);
  const load = useCallback(async () => { setError(null); try { setState(await requestState(lessonId, locale)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text.unavailable); } }, [lessonId, locale, text.unavailable]);

  const guestWords = useMemo(() => introWords.map((item) => ({
    id: item.wordId, lemma: item.word.lemma,
    translation: vocabularyMasteryTranslation(settings, item.word.lemma, locale, item.word.meanings[0]?.translation ?? item.word.meanings[0]?.definition ?? item.word.lemma),
    britishAudioUrl: item.word.britishAudioUrl, americanAudioUrl: item.word.americanAudioUrl,
  })), [introWords, locale, settings]);
  const guestStages = useMemo(() => buildVocabularyMasteryStages(guestWords.map((word) => word.id), guestWords.map((word) => word.id)), [guestWords]);
  const guestTask = useMemo(() => {
    const stage = guestStages[guestProgress.stageIndex];
    if (!stage) return null;
    const selectedWords = stage.wordIds.slice(0, stage.promptCount).map((wordId) => guestWords.find((word) => word.id === wordId)).filter((word): word is GuestWord => Boolean(word));
    if (selectedWords.length !== stage.promptCount) return null;
    const isSpeaking = stage.direction === "SPEAK";
    return {
      task: { stageIndex: guestProgress.stageIndex, stageKey: stage.key, direction: stage.direction, title: stage.title, requiredConsecutive: stage.requiredConsecutive, correctInRow: guestProgress.correctInRow, inputLanguage: stage.direction === "EN_RU" ? locale : "en", words: selectedWords.map((word) => isSpeaking ? { id: word.id, prompt: word.lemma, britishAudioUrl: word.britishAudioUrl, americanAudioUrl: word.americanAudioUrl } : { id: word.id, prompt: stage.direction === "EN_RU" ? word.lemma : word.translation }) } satisfies MasteryTask,
      expectedAnswers: selectedWords.map((word) => stage.direction === "EN_RU" ? word.translation : word.lemma),
    };
  }, [guestProgress.correctInRow, guestProgress.stageIndex, guestStages, guestWords, locale]);
  const task = canSaveProgress ? state?.task ?? null : guestTask?.task ?? null;
  const completed = canSaveProgress ? Boolean(state?.completed) : guestProgress.stageIndex >= guestStages.length;
  const progress = canSaveProgress ? state?.progress ?? { completedStages: 0, totalStages: 0, correctStages: 0, incorrectAttempts: 0 } : { completedStages: Math.min(guestProgress.stageIndex, guestStages.length), totalStages: guestStages.length, correctStages: guestProgress.stageIndex, incorrectAttempts: guestProgress.incorrectAttempts };
  const activeStageKey = task?.stageKey;
  const activeTaskWordCount = task?.words.length ?? 0;
  useEffect(() => { setAnswers(activeStageKey ? Array.from({ length: activeTaskWordCount }, () => "") : []); setFeedback(null); }, [activeStageKey, activeTaskWordCount]);
  useEffect(() => { if (!completed || completedSignalled.current) return; completedSignalled.current = true; onComplete?.(); }, [completed, onComplete]);

  function start() { setStarted(true); if (canSaveProgress) void load(); }
  function submitGuest(payload: { transcript?: string; answers?: string[] }) {
    if (!task || !guestTask) return;
    const isCorrect = task.direction === "SPEAK"
      ? assessPronunciation(guestTask.expectedAnswers[0] ?? "", payload.transcript ?? "").verdict === "MATCH"
      : Boolean(payload.answers && payload.answers.length === guestTask.expectedAnswers.length && payload.answers.every((answer, index) => cleanAnswer(answer) === cleanAnswer(guestTask.expectedAnswers[index] ?? "")));
    if (!isCorrect) { setGuestProgress((current) => ({ ...current, correctInRow: 0, incorrectAttempts: current.incorrectAttempts + 1 })); setFeedback({ tone: "error", text: text.reset }); return; }
    if (guestProgress.correctInRow + 1 < task.requiredConsecutive) { const nextCount = guestProgress.correctInRow + 1; setGuestProgress((current) => ({ ...current, correctInRow: nextCount })); setFeedback({ tone: "success", text: `${text.correct} ${nextCount} / ${task.requiredConsecutive}.` }); return; }
    const nextStage = guestProgress.stageIndex + 1;
    setGuestProgress((current) => ({ ...current, stageIndex: nextStage, correctInRow: 0 }));
    setFeedback({ tone: "success", text: nextStage >= guestStages.length ? text.lessonDone : text.stageDone });
  }
  async function submit(payload: { transcript?: string; answers?: string[] }) {
    if (!task || submitting) return;
    if (!canSaveProgress) { submitGuest(payload); return; }
    setSubmitting(true); setFeedback(null); setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/vocabulary-mastery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageIndex: task.stageIndex, locale, ...payload }) });
      const body = await response.json().catch(() => null) as { data?: Submission; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error ?? text.unavailable);
      const result = body.data; setState(result.state);
      if (!result.isCorrect) { setFeedback({ tone: "error", text: text.reset }); return; }
      if (result.stageCompleted) {
        setFeedback({ tone: "success", text: result.sessionCompleted ? text.lessonDone : text.stageDone });
        if (result.exerciseId) { const streak = result.motivationReward?.streak; onStageComplete?.({ exerciseId: result.exerciseId, streakTone: streak?.tone ?? null, streakMilestone: streak?.activated ? streak.modeStart : null }); }
        const reward = result.motivationReward;
        if (reward?.awarded) { setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Новый уровень!" : `+${reward.experience} XP`, detail: reward.coins ? `+${reward.coins} KRIN Coins` : text.lessonDone }]); notifyMotivationUpdated(); }
      } else { const next = result.state.task; setFeedback({ tone: "success", text: `${text.correct} ${next?.correctInRow ?? 0} / ${next?.requiredConsecutive ?? task.requiredConsecutive}.` }); }
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : text.unavailable); } finally { setSubmitting(false); }
  }
  function updateAnswer(index: number, value: string) { setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer)); }

  const firstBlockWords = guestWords.slice(0, 4);
  if (!started) return <section className={styles.intro} aria-label={text.firstBlock}>
    <details className={styles.introDetails} open><summary className={styles.introPill}><span aria-hidden="true">✦</span>{text.firstBlock}<strong>{text.blockWords.replace("{count}", String(firstBlockWords.length))}</strong></summary><ul className={styles.introWords}>{firstBlockWords.map((word, index) => <li key={word.id}><span>{index + 1}</span><strong>{word.lemma}</strong><em>{word.translation}</em></li>)}</ul></details>
    <button type="button" className={styles.start} onClick={start}>{text.start}</button>
  </section>;
  if (completed) return <section className={styles.completed} aria-live="polite"><RewardNotification events={rewardEvents} /><span aria-hidden="true">✓</span><h3>{text.completedTitle}</h3><p>{canSaveProgress ? text.completedText : text.guestCompleted}</p></section>;
  if (canSaveProgress && !state) return error ? <section className={styles.errorCard} role="alert">{error}</section> : <div className={styles.loading} aria-live="polite">{text.loading}</div>;
  if (!task) return <section className={styles.errorCard} role="alert">{error ?? text.unavailable}</section>;
  const directionText = directionCopy(task.direction, locale);
  const seriesProgress = Math.min(100, Math.round((task.correctInRow / task.requiredConsecutive) * 100));
  const overallProgress = progress.totalStages ? Math.round((progress.completedStages / progress.totalStages) * 100) : 0;
  return <section className={styles.mastery} aria-label="Vocabulary mastery practice">
    <RewardNotification events={rewardEvents} />
    <header className={styles.header}><div><p className={styles.eyebrow}>{canSaveProgress ? directionText.eyebrow : `${text.guest} · ${directionText.eyebrow}`}</p><h3>{localizedTaskTitle(task, locale)}</h3></div><div className={styles.overall} aria-label={`${progress.completedStages} of ${progress.totalStages} stages complete`}><strong>{progress.completedStages}/{progress.totalStages}</strong><span>{text.stages}</span></div></header>
    <div className={styles.overallTrack} aria-hidden="true"><span style={{ width: `${overallProgress}%` }} /></div><p className={styles.instruction}>{directionText.instruction}</p>
    {task.direction === "SPEAK" ? <div className={styles.speakingCard}><p className={styles.word}>{task.words[0]?.prompt}</p><PronunciationCoach locale={locale} word={task.words[0]?.prompt ?? ""} britishAudioUrl={task.words[0]?.britishAudioUrl} americanAudioUrl={task.words[0]?.americanAudioUrl} onAssessment={({ transcript }) => { void submit({ transcript }); }} /></div> : <form className={styles.translationForm} onSubmit={(event) => { event.preventDefault(); void submit({ answers }); }}><div className={styles.promptList}>{task.words.map((word, index) => <label key={word.id} className={styles.promptRow}><span className={styles.prompt}>{word.prompt}</span><span className={styles.answerLabel}>{directionText.inputLabel}</span><input value={answers[index] ?? ""} onChange={(event) => updateAnswer(index, event.target.value)} lang={task.inputLanguage} autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="text" placeholder={task.inputLanguage === "en" ? text.englishPlaceholder : text.russianPlaceholder} disabled={submitting} required /></label>)}</div><p className={styles.keyboardHint}>{text.keyboard} {task.inputLanguage === "en" ? text.english : text.russian}</p><button type="submit" className={styles.submit} disabled={submitting || answers.length !== task.words.length || answers.some((answer) => !answer.trim())}>{submitting ? text.checking : text.check}</button></form>}
    <div className={styles.series} aria-live="polite"><div><strong>{task.correctInRow} / {task.requiredConsecutive}</strong><span>{text.consecutive}</span></div><div className={styles.seriesTrack} aria-hidden="true"><span style={{ width: `${seriesProgress}%` }} /></div></div>
    {feedback ? <p className={`${styles.feedback} ${feedback.tone === "success" ? styles.feedbackSuccess : feedback.tone === "error" ? styles.feedbackError : ""}`} role="status">{feedback.text}</p> : null}{error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>;
}
