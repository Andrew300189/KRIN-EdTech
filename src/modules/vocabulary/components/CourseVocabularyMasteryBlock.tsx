"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { PronunciationCoach } from "@/modules/vocabulary/components/PronunciationCoach";
import { useLocale } from "@/core/i18n/locale";
import { learnerAnswerFeedback } from "@/core/i18n/learner-answer-feedback";
import { assessPronunciation } from "@/modules/vocabulary/utils/pronunciation";
import { buildVocabularyMasteryStages, vocabularyMasteryTranslation, type VocabularyMasteryLocale } from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import styles from "./CourseVocabularyMasteryBlock.module.css";

type Direction = "SPEAK" | "EN_RU" | "RU_EN";
type IntroWord = { wordId: string; word: { lemma: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null; meanings: Array<{ translation: string | null; definition: string }> } };
type MasteryTask = { stageIndex: number; stageKey: string; direction: Direction; title: string; kind: "WORD" | "BLOCK_REVIEW" | "CUMULATIVE_REVIEW"; requiredConsecutive: number; correctInRow: number; inputLanguage: "ru" | "uk" | "en"; metaWords: Array<{ lemma: string; lessonNumber: number }>; words: Array<{ id: string; lemma: string; translation?: string; lessonNumber: number; prompt: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null }> };
type MasteryState = { completed: boolean; progress: { completedStages: number; totalStages: number; correctStages: number; incorrectAttempts: number }; task: MasteryTask | null };
type Submission = { isCorrect: boolean; stageCompleted: boolean; sessionCompleted: boolean; state: MasteryState; exerciseId: string | null; motivationReward: { awarded: boolean; experience: number; coins: number; levelUp: boolean; streak?: { tone: string | null; activated: boolean; modeStart: number | null } | null } | null };
type StageReward = { experience: number; levelUp: boolean; streak: { tone: string | null; activated: boolean; modeStart: number | null } | null };
type GuestProgress = { stageIndex: number; correctInRow: number; incorrectAttempts: number; selectedWordIds: string[]; missedWordIds: string[] };
type GuestWord = { id: string; lemma: string; translation: string; britishAudioUrl: string | null | undefined; americanAudioUrl: string | null | undefined };

const copy = {
  ru: {
    firstBlock: "Слова первого блока", start: "Начать", blockWords: "{count} слова", guest: "Гостевая практика", stages: "этапов", lessonGoal: "Цель урока", master: "Освоить слова", review: "Повторить", lesson: "Урок",
    speakEyebrow: "Читай · повторяй", speakInstruction: "Прочитайте английское слово и его перевод, затем произнесите английское слово вслух. Три точных распознавания подряд откроют следующую карточку.",
    enRuEyebrow: "Английский → русский", enRuInstruction: "Дайте пять правильных ответов в перемешку. Ошибочные слова вернутся позже.", enRuLabel: "Перевод на русский",
    ruEnEyebrow: "Русский → английский", ruEnInstruction: "Дайте пять правильных ответов в перемешку. Ошибочные слова вернутся позже.", ruEnLabel: "Английский термин",
    russianPlaceholder: "Введите перевод", englishPlaceholder: "Введите английский термин", keyboard: "Язык клавиатуры:", russian: "русский", english: "английский",
    check: "Проверить", checking: "Проверяем…", consecutive: "правильных ответов", correct: "Правильно.", levelUp: "Новый уровень!", reset: "Пока не засчитано. Это слово вернётся в следующих карточках.",
    stageDone: "Этап завершён — следующая карточка уже готова.", lessonDone: "Все слова этого урока освоены.", completedTitle: "Блок слов завершён", completedText: "Вы прошли все обязательные серии.", guestCompleted: "Гостевая практика завершена. Войдите в аккаунт, чтобы сохранять прогресс и получать XP.",
    loading: "Загружаем практику слов…", unavailable: "Практика слов недоступна.", word: "Слово", wordsTogether: "слов вместе", thisLesson: "Этот урок", mixed: "Смешанное повторение",
  },
  uk: {
    firstBlock: "Слова першого блоку", start: "Почати", blockWords: "{count} слова", guest: "Гостьова практика", stages: "етапів", lessonGoal: "Мета уроку", master: "Освоїти слова", review: "Повторити", lesson: "Урок",
    speakEyebrow: "Читай · повторюй", speakInstruction: "Прочитайте англійське слово та його переклад, потім вимовте англійське слово вголос. Три точні розпізнавання поспіль відкриють наступну картку.",
    enRuEyebrow: "Англійська → українська", enRuInstruction: "Дайте п’ять правильних відповідей упереміш. Помилкові слова повернуться пізніше.", enRuLabel: "Переклад українською",
    ruEnEyebrow: "Українська → англійська", ruEnInstruction: "Дайте п’ять правильних відповідей упереміш. Помилкові слова повернуться пізніше.", ruEnLabel: "Англійський термін",
    russianPlaceholder: "Введіть переклад", englishPlaceholder: "Введіть англійський термін", keyboard: "Мова клавіатури:", russian: "українська", english: "англійська",
    check: "Перевірити", checking: "Перевіряємо…", consecutive: "правильних відповідей", correct: "Правильно.", levelUp: "Новий рівень!", reset: "Поки не зараховано. Це слово повернеться в наступних картках.",
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
function guestResumeKey(lessonId: string) {
  return `krin:vocabulary-guest-preview:${lessonId}`;
}

function readGuestResumeStage(lessonId: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(guestResumeKey(lessonId)) ?? "null") as { stageIndex?: unknown } | null;
    return typeof parsed?.stageIndex === "number" && Number.isInteger(parsed.stageIndex) && parsed.stageIndex > 0 ? parsed.stageIndex : undefined;
  } catch {
    return undefined;
  }
}

function writeGuestResumeStage(lessonId: string, stageIndex: number) {
  try { window.localStorage.setItem(guestResumeKey(lessonId), JSON.stringify({ stageIndex })); } catch { /* Storage is optional. */ }
}

function clearGuestResumeStage(lessonId: string) {
  try { window.localStorage.removeItem(guestResumeKey(lessonId)); } catch { /* Storage is optional. */ }
}

async function requestState(lessonId: string, locale: VocabularyMasteryLocale, guestStageIndex?: number) {
  const parameters = new URLSearchParams({ locale });
  if (guestStageIndex) parameters.set("guestStage", String(guestStageIndex));
  const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/vocabulary-mastery?${parameters}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: MasteryState; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to load vocabulary practice");
  return payload.data;
}

function guestSampleWordIds(wordIds: string[], count: number) {
  if (count >= wordIds.length) return [...wordIds];
  const pool = [...wordIds];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, count);
}

function guestSelectionKey(wordIds: string[]) {
  return [...wordIds].sort().join("\u0000");
}

function nextGuestWordIds(stage: ReturnType<typeof buildVocabularyMasteryStages>[number], correctInRow: number, previousWordIds: string[] = [], missedWordIds: string[] = []) {
  if (!stage.rotatePrompt || stage.wordIds.length <= stage.promptCount) return guestSampleWordIds(stage.wordIds, stage.promptCount);
  if (stage.promptCount > 1) {
    const previousKey = guestSelectionKey(previousWordIds);
    const missedCandidates = stage.wordIds.filter((wordId) => missedWordIds.includes(wordId));
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const focusedMissedWord = missedCandidates.length ? missedCandidates[Math.floor(Math.random() * missedCandidates.length)] : null;
      const remaining = focusedMissedWord ? stage.wordIds.filter((wordId) => wordId !== focusedMissedWord) : stage.wordIds;
      const selected = focusedMissedWord
        ? [focusedMissedWord, ...guestSampleWordIds(remaining, stage.promptCount - 1)]
        : guestSampleWordIds(stage.wordIds, stage.promptCount);
      if (guestSelectionKey(selected) !== previousKey) return selected;
    }
    for (let offset = 0; offset < stage.wordIds.length; offset += 1) {
      const selected = Array.from({ length: stage.promptCount }, (_, index) => stage.wordIds[(offset + index) % stage.wordIds.length]!);
      if (guestSelectionKey(selected) !== previousKey) return selected;
    }
    return guestSampleWordIds(stage.wordIds, stage.promptCount);
  }
  const previous = previousWordIds[0];
  if (correctInRow < stage.wordIds.length) {
    const previousIndex = previous ? stage.wordIds.indexOf(previous) : -1;
    return [stage.wordIds[previousIndex >= 0 ? (previousIndex + 1) % stage.wordIds.length : correctInRow]!];
  }
  const candidates = stage.wordIds.filter((wordId) => wordId !== previous);
  const missedCandidates = candidates.filter((wordId) => missedWordIds.includes(wordId));
  if (missedCandidates.length) return [missedCandidates[Math.floor(Math.random() * missedCandidates.length)]!];
  const pool = candidates.length ? candidates : stage.wordIds;
  return [pool[Math.floor(Math.random() * pool.length)]!];
}

function selectGuestWordIds(stage: ReturnType<typeof buildVocabularyMasteryStages>[number], correctInRow: number, selectedWordIds: string[] = []) {
  return selectedWordIds.length ? selectedWordIds : nextGuestWordIds(stage, correctInRow);
}

export function CourseVocabularyMasteryBlock({ lessonId, canSaveProgress = true, contentLocale, settings, introWords = [], guestStageLimit, onGuestLimitReached, onStageComplete, onComplete }: {
  lessonId: string; canSaveProgress?: boolean; contentLocale?: "ru" | "uk"; settings?: unknown; introWords?: IntroWord[]; guestStageLimit?: number;
  onGuestLimitReached?: (resumeStageIndex: number) => void;
  onStageComplete?: (result: { exerciseId: string; streakTone?: string | null; streakMilestone?: number | null }) => void; onComplete?: () => void;
}) {
  const { locale: selectedLocale } = useLocale();
  const locale: VocabularyMasteryLocale = contentLocale ?? (selectedLocale === "uk" ? "uk" : "ru");
  const text = copy[locale];
  const answerFeedback = learnerAnswerFeedback(locale);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<MasteryState | null>(null);
  const [guestProgress, setGuestProgress] = useState<GuestProgress>({ stageIndex: 0, correctInRow: 0, incorrectAttempts: 0, selectedWordIds: [], missedWordIds: [] });
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rewardCelebration, setRewardCelebration] = useState<StageReward | null>(null);
  const completedSignalled = useRef(false);
  const rewardCelebrationTimer = useRef<number | null>(null);
  const load = useCallback(async () => {
    setError(null);
    const resumeStage = readGuestResumeStage(lessonId);
    try {
      setState(await requestState(lessonId, locale, resumeStage));
      if (resumeStage) clearGuestResumeStage(lessonId);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text.unavailable); }
  }, [lessonId, locale, text.unavailable]);

  const guestWords = useMemo(() => introWords.map((item) => ({
    id: item.wordId, lemma: item.word.lemma,
    translation: vocabularyMasteryTranslation(settings, item.word.lemma, locale, item.word.meanings[0]?.translation ?? item.word.meanings[0]?.definition ?? item.word.lemma),
    britishAudioUrl: item.word.britishAudioUrl, americanAudioUrl: item.word.americanAudioUrl,
  })), [introWords, locale, settings]);
  const guestStages = useMemo(() => buildVocabularyMasteryStages(guestWords.map((word) => word.id), guestWords.map((word) => word.id)), [guestWords]);
  const allowedGuestStageCount = Math.max(1, Math.min(guestStages.length, guestStageLimit ?? guestStages.length));
  const guestTask = useMemo(() => {
    const stage = guestStages[guestProgress.stageIndex];
    if (!stage) return null;
    const selectedWordIds = selectGuestWordIds(stage, guestProgress.correctInRow, guestProgress.selectedWordIds);
    const selectedWords = selectedWordIds.map((wordId) => guestWords.find((word) => word.id === wordId)).filter((word): word is GuestWord => Boolean(word));
    if (selectedWords.length !== stage.promptCount) return null;
    const isSpeaking = stage.direction === "SPEAK";
    return {
      task: { stageIndex: guestProgress.stageIndex, stageKey: stage.key, direction: stage.direction, title: stage.title, kind: stage.kind, requiredConsecutive: stage.requiredConsecutive, correctInRow: guestProgress.correctInRow, inputLanguage: stage.direction === "EN_RU" ? locale : "en", metaWords: stage.wordIds.map((wordId) => guestWords.find((word) => word.id === wordId)).filter((word): word is GuestWord => Boolean(word)).map((word) => ({ lemma: word.lemma, lessonNumber: 1 })), words: selectedWords.map((word) => isSpeaking ? { id: word.id, lemma: word.lemma, translation: word.translation, lessonNumber: 1, prompt: word.lemma, britishAudioUrl: word.britishAudioUrl, americanAudioUrl: word.americanAudioUrl } : { id: word.id, lemma: word.lemma, lessonNumber: 1, prompt: stage.direction === "EN_RU" ? word.lemma : word.translation }) } satisfies MasteryTask,
      expectedAnswers: selectedWords.map((word) => stage.direction === "EN_RU" ? word.translation : word.lemma),
    };
  }, [guestProgress.correctInRow, guestProgress.selectedWordIds, guestProgress.stageIndex, guestStages, guestWords, locale]);
  const task = canSaveProgress ? state?.task ?? null : guestTask?.task ?? null;
  const completed = canSaveProgress ? Boolean(state?.completed) : guestProgress.stageIndex >= guestStages.length;
  const progress = canSaveProgress ? state?.progress ?? { completedStages: 0, totalStages: 0, correctStages: 0, incorrectAttempts: 0 } : { completedStages: Math.min(guestProgress.stageIndex, guestStages.length), totalStages: guestStages.length, correctStages: guestProgress.stageIndex, incorrectAttempts: guestProgress.incorrectAttempts };
  const activeTaskKey = task ? `${task.stageKey}:${task.words.map((word) => word.id).join(",")}` : null;
  const activeTaskWordCount = task?.words.length ?? 0;
  useEffect(() => { setAnswers(activeTaskKey ? Array.from({ length: activeTaskWordCount }, () => "") : []); setFeedback(null); }, [activeTaskKey, activeTaskWordCount]);
  useEffect(() => { if (!completed || completedSignalled.current) return; completedSignalled.current = true; onComplete?.(); }, [completed, onComplete]);
  useEffect(() => () => { if (rewardCelebrationTimer.current !== null) window.clearTimeout(rewardCelebrationTimer.current); }, []);

  function showStageReward(reward: StageReward) {
    setRewardCelebration(reward);
    if (rewardCelebrationTimer.current !== null) window.clearTimeout(rewardCelebrationTimer.current);
    rewardCelebrationTimer.current = window.setTimeout(() => {
      setRewardCelebration(null);
      rewardCelebrationTimer.current = null;
    }, 1_450);
  }

  function start() { setStarted(true); if (canSaveProgress) void load(); }
  function submitGuest(payload: { transcript?: string; answers?: string[] }) {
    if (!task || !guestTask) return;
    const isCorrect = task.direction === "SPEAK"
      ? assessPronunciation(guestTask.expectedAnswers[0] ?? "", payload.transcript ?? "").verdict === "MATCH"
      : Boolean(payload.answers && payload.answers.length === guestTask.expectedAnswers.length && payload.answers.every((answer, index) => cleanAnswer(answer) === cleanAnswer(guestTask.expectedAnswers[index] ?? "")));
    if (!isCorrect) { setGuestProgress((current) => { const missedWordIds = [...new Set([...current.missedWordIds, ...current.selectedWordIds])]; return { ...current, incorrectAttempts: current.incorrectAttempts + 1, missedWordIds, selectedWordIds: nextGuestWordIds(guestStages[current.stageIndex]!, current.correctInRow, current.selectedWordIds, missedWordIds) }; }); setFeedback({ tone: "error", text: text.reset }); return; }
    if (guestProgress.correctInRow + 1 < task.requiredConsecutive) { const nextCount = guestProgress.correctInRow + 1; setGuestProgress((current) => { const missedWordIds = current.missedWordIds.filter((wordId) => !current.selectedWordIds.includes(wordId)); return { ...current, correctInRow: nextCount, missedWordIds, selectedWordIds: nextGuestWordIds(guestStages[current.stageIndex]!, nextCount, current.selectedWordIds, missedWordIds) }; }); setFeedback({ tone: "success", text: `${text.correct} ${nextCount} / ${task.requiredConsecutive}.` }); return; }
    const nextStage = guestProgress.stageIndex + 1;
    setGuestProgress((current) => ({ ...current, stageIndex: nextStage, correctInRow: 0, selectedWordIds: [], missedWordIds: [] }));
    if (nextStage >= allowedGuestStageCount && nextStage < guestStages.length) {
      writeGuestResumeStage(lessonId, nextStage);
      onGuestLimitReached?.(nextStage);
      setFeedback({ tone: "success", text: text.stageDone });
      return;
    }
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
        if (reward?.awarded) {
          showStageReward({ experience: reward.experience, levelUp: reward.levelUp, streak: reward.streak ?? null });
          notifyMotivationUpdated();
        }
      } else { const next = result.state.task; setFeedback({ tone: "success", text: `${text.correct} ${next?.correctInRow ?? 0} / ${next?.requiredConsecutive ?? task.requiredConsecutive}.` }); }
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : text.unavailable); } finally { setSubmitting(false); }
  }
  function updateAnswer(index: number, value: string) { setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer)); }

  const firstBlockWords = guestWords.slice(0, 4);
  const metaWords = task?.metaWords.length ? task.metaWords : firstBlockWords.map((word) => ({ lemma: word.lemma, lessonNumber: 1 }));
  const isReviewTask = task?.kind === "BLOCK_REVIEW" || task?.kind === "CUMULATIVE_REVIEW";
  const reviewGroups = Array.from(metaWords.reduce((groups, word) => {
    const current = groups.get(word.lessonNumber) ?? [];
    current.push(word.lemma);
    groups.set(word.lessonNumber, current);
    return groups;
  }, new Map<number, string[]>()).entries());
  const lessonMeta = <aside className={styles.lessonMeta} aria-label={text.lessonGoal}>
    <span className={styles.metaLabel}>{text.lessonGoal}</span>
    <span className={styles.metaLead}>{isReviewTask ? text.review : text.master}</span>
    <div className={styles.metaWords}>
      {isReviewTask
        ? reviewGroups.map(([lessonNumber, words]) => <span key={lessonNumber} className={styles.metaLesson} tabIndex={0}>{text.lesson} {lessonNumber}<span className={styles.metaTooltip} role="tooltip">{words.join(" · ")}</span></span>)
        : metaWords.slice(0, 4).map((word) => <span key={word.lemma} className={styles.metaWord}>{word.lemma}</span>)}
    </div>
  </aside>;
  if (!started) return <section className={styles.intro} aria-label={text.firstBlock}>
    {lessonMeta}
    <details className={styles.introDetails} open><summary className={styles.introPill}><span aria-hidden="true">✦</span>{text.firstBlock}<strong>{text.blockWords.replace("{count}", String(firstBlockWords.length))}</strong></summary><ul className={styles.introWords}>{firstBlockWords.map((word, index) => <li key={word.id}><span>{index + 1}</span><strong>{word.lemma}</strong><em>{word.translation}</em></li>)}</ul></details>
    <button type="button" className={styles.start} onClick={start}>{text.start}</button>
  </section>;
  if (completed) return <section className={styles.completed} aria-live="polite"><span aria-hidden="true">✓</span><h3>{text.completedTitle}</h3><p>{canSaveProgress ? text.completedText : text.guestCompleted}</p></section>;
  if (canSaveProgress && !state) return error ? <section className={styles.errorCard} role="alert">{error}</section> : <div className={styles.loading} aria-live="polite">{text.loading}</div>;
  if (!task) return <section className={styles.errorCard} role="alert">{error ?? text.unavailable}</section>;
  const directionText = directionCopy(task.direction, locale);
  const seriesProgress = Math.min(100, Math.round((task.correctInRow / task.requiredConsecutive) * 100));
  const overallProgress = progress.totalStages ? Math.round((progress.completedStages / progress.totalStages) * 100) : 0;
  const streakTone = rewardCelebration?.streak?.tone && /^[a-z-]+$/.test(rewardCelebration.streak.tone) ? rewardCelebration.streak.tone : null;
  const streakActivated = Boolean(rewardCelebration?.streak?.activated && streakTone);
  return <section className={styles.mastery} aria-label="Vocabulary mastery practice">
    {rewardCelebration ? <div className="lesson-correct-celebration" role="status" aria-live="polite">
      {streakActivated
        ? <div className={`lesson-streak-celebration lesson-exercise-streak-${streakTone}`}><strong>×{rewardCelebration.streak?.modeStart}</strong></div>
        : <><strong>{answerFeedback.xpAwarded(rewardCelebration.experience)}</strong>{rewardCelebration.levelUp ? <span>{text.levelUp}</span> : null}</>}
    </div> : null}
    {lessonMeta}
    <header className={styles.header}><div><p className={styles.eyebrow}>{canSaveProgress ? directionText.eyebrow : `${text.guest} · ${directionText.eyebrow}`}</p><h3>{localizedTaskTitle(task, locale)}</h3></div><div className={styles.overall} aria-label={`${progress.completedStages} of ${progress.totalStages} stages complete`}><strong>{progress.completedStages}/{progress.totalStages}</strong><span>{text.stages}</span></div></header>
    <div className={styles.overallTrack} aria-hidden="true"><span style={{ width: `${overallProgress}%` }} /></div><p className={styles.instruction}>{directionText.instruction}</p>
    {task.direction === "SPEAK" ? <div className={styles.speakingCard}><p className={styles.word}>{task.words[0]?.prompt}</p>{task.words[0]?.translation ? <p className={styles.wordTranslation}>{task.words[0].translation}</p> : null}<PronunciationCoach locale={locale} word={task.words[0]?.prompt ?? ""} britishAudioUrl={task.words[0]?.britishAudioUrl} americanAudioUrl={task.words[0]?.americanAudioUrl} onAssessment={({ transcript }) => { void submit({ transcript }); }} /></div> : <form className={styles.translationForm} onSubmit={(event) => { event.preventDefault(); void submit({ answers }); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void submit({ answers }); } }}><div className={styles.promptList}>{task.words.map((word, index) => <label key={word.id} className={styles.promptRow}><span className={styles.prompt}>{word.prompt}</span><span className={styles.answerLabel}>{directionText.inputLabel}</span><input value={answers[index] ?? ""} onChange={(event) => updateAnswer(index, event.target.value)} lang={task.inputLanguage} autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="text" placeholder={task.inputLanguage === "en" ? text.englishPlaceholder : text.russianPlaceholder} disabled={submitting} required /></label>)}</div><div className={styles.formActions}><p className={styles.keyboardHint}>{text.keyboard} {task.inputLanguage === "en" ? text.english : text.russian}</p><button type="submit" className={styles.submit} disabled={submitting || answers.length !== task.words.length || answers.some((answer) => !answer.trim())}>{submitting ? text.checking : text.check}</button></div></form>}
    <div className={styles.series} aria-live="polite"><div><strong>{task.correctInRow} / {task.requiredConsecutive}</strong><span>{text.consecutive}</span></div><div className={styles.seriesTrack} aria-hidden="true"><span style={{ width: `${seriesProgress}%` }} /></div></div>
    {feedback ? <p className={`${styles.feedback} ${feedback.tone === "success" ? styles.feedbackSuccess : feedback.tone === "error" ? styles.feedbackError : ""}`} role="status">{feedback.text}</p> : null}{error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>;
}
