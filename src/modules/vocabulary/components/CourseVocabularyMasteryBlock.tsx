"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { PronunciationCoach } from "@/modules/vocabulary/components/PronunciationCoach";
import styles from "./CourseVocabularyMasteryBlock.module.css";

type Direction = "SPEAK" | "EN_RU" | "RU_EN";
type MasteryTask = {
  stageIndex: number;
  stageKey: string;
  direction: Direction;
  title: string;
  requiredConsecutive: number;
  correctInRow: number;
  inputLanguage: "ru" | "en";
  words: Array<{ id: string; prompt: string; britishAudioUrl?: string | null; americanAudioUrl?: string | null }>;
};
type MasteryState = {
  completed: boolean;
  progress: { completedStages: number; totalStages: number; correctStages: number; incorrectAttempts: number };
  task: MasteryTask | null;
};
type Submission = {
  isCorrect: boolean;
  stageCompleted: boolean;
  sessionCompleted: boolean;
  state: MasteryState;
  exerciseId: string | null;
  motivationReward: { awarded: boolean; experience: number; coins: number; levelUp: boolean; streak?: { tone: string | null; activated: boolean; modeStart: number | null } | null } | null;
};

const copyForDirection: Record<Direction, { eyebrow: string; instruction: string; inputLabel: string }> = {
  SPEAK: { eyebrow: "Слушай · повторяй", instruction: "Прослушайте слово и повторите его вслух. Три точных распознавания подряд откроют следующую карточку.", inputLabel: "" },
  EN_RU: { eyebrow: "Английский → русский", instruction: "Введите каждый перевод правильно пять раз подряд.", inputLabel: "Перевод на русский" },
  RU_EN: { eyebrow: "Русский → английский", instruction: "Введите каждый английский термин правильно пять раз подряд.", inputLabel: "Английский термин" },
};

async function requestState(lessonId: string) {
  const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/vocabulary-mastery`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: MasteryState; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to load vocabulary practice");
  return payload.data;
}

export function CourseVocabularyMasteryBlock({
  lessonId,
  canSaveProgress = true,
  onStageComplete,
  onComplete,
}: {
  lessonId: string;
  canSaveProgress?: boolean;
  onStageComplete?: (result: { exerciseId: string; streakTone?: string | null; streakMilestone?: number | null }) => void;
  onComplete?: () => void;
}) {
  const [state, setState] = useState<MasteryState | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const completedSignalled = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setState(await requestState(lessonId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить практику слов");
    }
  }, [lessonId]);

  useEffect(() => { if (canSaveProgress) void load(); }, [canSaveProgress, load]);

  const task = state?.task ?? null;
  const activeStageKey = task?.stageKey;
  const activeTaskWordCount = task?.words.length ?? 0;
  useEffect(() => {
    setAnswers(activeStageKey ? Array.from({ length: activeTaskWordCount }, () => "") : []);
    setFeedback(null);
  }, [activeStageKey, activeTaskWordCount]);

  useEffect(() => {
    if (!state?.completed || completedSignalled.current) return;
    completedSignalled.current = true;
    onComplete?.();
  }, [onComplete, state?.completed]);

  async function submit(payload: { transcript?: string; answers?: string[] }) {
    if (!task || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/vocabulary-mastery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageIndex: task.stageIndex, ...payload }),
      });
      const body = await response.json().catch(() => null) as { data?: Submission; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error ?? "Unable to check vocabulary answer");
      const result = body.data;
      setState(result.state);
      if (!result.isCorrect) {
        setFeedback({ tone: "error", text: "Серия обнулилась. Прослушайте или проверьте термин и попробуйте ещё раз — засчитываются только правильные попытки." });
        return;
      }
      if (result.stageCompleted) {
        setFeedback({ tone: "success", text: result.sessionCompleted ? "Все слова этого урока освоены." : "Этап завершён — следующая карточка уже готова." });
        if (result.exerciseId) {
          const streak = result.motivationReward?.streak;
          onStageComplete?.({
            exerciseId: result.exerciseId,
            streakTone: streak?.tone ?? null,
            streakMilestone: streak?.activated ? streak.modeStart : null,
          });
        }
        const reward = result.motivationReward;
        if (reward?.awarded) {
          setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Новый уровень!" : `+${reward.experience} XP`, detail: reward.coins ? `+${reward.coins} KRIN Coins` : "Освоение слов" }]);
          notifyMotivationUpdated();
        }
      } else {
        const next = result.state.task;
        setFeedback({ tone: "success", text: `Правильно. ${next?.correctInRow ?? 0} из ${next?.requiredConsecutive ?? task.requiredConsecutive} подряд.` });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось проверить ответ");
    } finally {
      setSubmitting(false);
    }
  }

  function updateAnswer(index: number, value: string) {
    setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer));
  }

  if (!canSaveProgress) return <section className={styles.errorCard}>Войдите в аккаунт, чтобы начать персональную практику слов и сохранить серии ответов.</section>;
  if (!state && !error) return <div className={styles.loading} aria-live="polite">Загружаем практику слов…</div>;
  if (state?.completed) return <section className={styles.completed} aria-live="polite"><RewardNotification events={rewardEvents} /><span aria-hidden="true">✓</span><h3>Блок слов завершён</h3><p>Вы прошли все обязательные серии. Награда за урок уже готова.</p></section>;
  if (!task) return <section className={styles.errorCard} role="alert">{error ?? "Практика слов недоступна."}</section>;

  const copy = copyForDirection[task.direction];
  const seriesProgress = Math.min(100, Math.round((task.correctInRow / task.requiredConsecutive) * 100));
  const overallProgress = task ? Math.round((state!.progress.completedStages / state!.progress.totalStages) * 100) : 0;

  return <section className={styles.mastery} aria-label="Vocabulary mastery practice">
    <RewardNotification events={rewardEvents} />
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h3>{task.title}</h3>
      </div>
      <div className={styles.overall} aria-label={`${state.progress.completedStages} of ${state.progress.totalStages} stages complete`}>
        <strong>{state.progress.completedStages}/{state.progress.totalStages}</strong>
        <span>этапов</span>
      </div>
    </header>
    <div className={styles.overallTrack} aria-hidden="true"><span style={{ width: `${overallProgress}%` }} /></div>
    <p className={styles.instruction}>{copy.instruction}</p>

    {task.direction === "SPEAK" ? <div className={styles.speakingCard}>
      <p className={styles.word}>{task.words[0]?.prompt}</p>
      <PronunciationCoach
        word={task.words[0]?.prompt ?? ""}
        britishAudioUrl={task.words[0]?.britishAudioUrl}
        americanAudioUrl={task.words[0]?.americanAudioUrl}
        onAssessment={({ transcript }) => { void submit({ transcript }); }}
      />
    </div> : <form className={styles.translationForm} onSubmit={(event) => { event.preventDefault(); void submit({ answers }); }}>
      <div className={styles.promptList}>
        {task.words.map((word, index) => <label key={word.id} className={styles.promptRow}>
          <span className={styles.prompt}>{word.prompt}</span>
          <span className={styles.answerLabel}>{copy.inputLabel}</span>
          <input
            value={answers[index] ?? ""}
            onChange={(event) => updateAnswer(index, event.target.value)}
            lang={task.inputLanguage}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            placeholder={task.inputLanguage === "ru" ? "Введите перевод" : "Введите английский термин"}
            disabled={submitting}
            required
          />
        </label>)}
      </div>
      <p className={styles.keyboardHint}>Язык клавиатуры: {task.inputLanguage === "ru" ? "русский" : "английский"}</p>
      <button type="submit" className={styles.submit} disabled={submitting || answers.length !== task.words.length || answers.some((answer) => !answer.trim())}>{submitting ? "Проверяем…" : "Проверить"}</button>
    </form>}

    <div className={styles.series} aria-live="polite">
      <div><strong>{task.correctInRow} / {task.requiredConsecutive}</strong><span>правильно подряд</span></div>
      <div className={styles.seriesTrack} aria-hidden="true"><span style={{ width: `${seriesProgress}%` }} /></div>
    </div>
    {feedback ? <p className={`${styles.feedback} ${feedback.tone === "success" ? styles.feedbackSuccess : feedback.tone === "error" ? styles.feedbackError : ""}`} role="status">{feedback.text}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>;
}
