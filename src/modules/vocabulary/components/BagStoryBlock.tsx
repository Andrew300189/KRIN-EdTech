"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { learnerAnswerFeedback } from "@/core/i18n/learner-answer-feedback";
import { PronunciationCoach } from "./PronunciationCoach";
import { vocabularyMasteryTranslation } from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import { BAG_CHUNK_STAGE_SPAN, bagChunkKey, bagQuickCheckEligible, buildBagReviewStages, buildBagStoryStages, bagStory, isBagStorySettings, type BagStage } from "@/modules/vocabulary/utils/a-bag-story-plan";
import { assessPronunciation } from "@/modules/vocabulary/utils/pronunciation";
import { experienceForExerciseSpeed, remainingExerciseSpeedPercent } from "@/modules/courses/utils/exercise-speed-reward";
import { applyAnswerKeyboardLayout } from "@/modules/lessons/utils/answer-keyboard-layout";
import styles from "./CourseVocabularyMasteryBlock.module.css";

type IntroWord = { wordId: string; word: { lemma: string; meanings: Array<{ translation: string | null; definition: string }> } };
type Task = { stageIndex: number; stepIndex: number; stageKey: string; kind: string; mode: "SPEAK" | "CHOICE" | "TYPE" | "ASSEMBLE"; code: string; cardNumber: number; chunkCode: string | null; chunkLocal: string | null; sentenceMode: string | null; sentenceLocal: string | null; prompt: string; speakTarget: string | null; audioTarget: string | null; options: Array<{ id: string; label: string }>; assembleWords: string[]; storyLines: string[]; stepCount: number; failedLine: boolean; hintEnglish: string | null; reviewCheck: boolean };
type State = { completed: boolean; progress: { completedStages: number; totalStages: number; incorrectAttempts: number }; task: Task | null; speedWindow?: { id: string; openedAt: string; windowSeconds: number } | null };
type Submission = { isCorrect: boolean; stageCompleted: boolean; state: State; exerciseId: string | null; motivationReward: { awarded: boolean; experience: number; levelUp?: boolean; streak?: { tone: string | null; activated: boolean; modeStart: number | null } | null; streakMilestones?: number[]; lessonAnswerStreak?: { current: number; recoverable: number } } | null };

function speak(value: string, slow = false) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = "en-GB";
  utterance.rate = slow ? .63 : .85;
  window.speechSynthesis.speak(utterance);
}

function guestCard(stage: BagStage, stepIndex: number, words: Array<{ en: string; local: string }>, locale: "uk" | "ru", reviewCheck = false, failedLine = false): Task {
  const word = words[stage.wordOrdinal]!;
  const story = bagStory(word.en, word.local, locale);
  const sentence = stage.storyIndex ? story[stage.storyIndex - 1]! : null;
  const chunk = stage.kind === "BAG_CHUNK" ? sentence!.chunks[stage.chunkIndex!]! : null;
  const recall = stage.kind === "BAG_RECALL" || stage.kind === "BAG_REVIEW" && stage.code === "RECALL";
  const chunkChoice = stage.kind === "BAG_CHUNK" && (stage.chunkCode === "MEANING" || stage.chunkCode === "HEAR");
  const mode: Task["mode"] = reviewCheck ? "SPEAK" : chunkChoice || stage.code === "CE" || stage.code === "CL" ? "CHOICE" : stage.kind === "BAG_SENTENCE_ASSEMBLE" || stage.chunkCode === "ASSEMBLE" ? "ASSEMBLE" : stage.chunkCode === "TYPE" || stage.code === "TL" || stage.code === "TE" ? "TYPE" : "SPEAK";
  const target = chunk ? chunk.english : recall ? story[stepIndex]!.english : stage.kind === "BAG_SENTENCE" || stage.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.english : stage.code === "TE" || stage.code === "CE" ? word.local : word.en;
  const prompt = chunk ? reviewCheck ? chunk.local : stage.chunkCode === "HEAR" ? locale === "uk" ? "Послухайте та виберіть почуте" : "Послушайте и выберите услышанное" : ["INTRO", "VISIBLE", "MEANING"].includes(stage.chunkCode!) ? chunk.english : chunk.local : recall ? story[stepIndex]!.local : stage.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.local : stage.kind === "BAG_SENTENCE" ? stage.sentenceMode === "VISIBLE" ? sentence!.english : sentence!.local : stage.code === "P" ? stage.cardNumber === 1 ? word.en : word.local : stage.code === "TE" || stage.code === "CE" ? word.en : word.local;
  const chunkPool = story.flatMap((line) => line.chunks).filter((item, index, all) => all.findIndex((candidate) => candidate.english === item.english) === index);
  const options = mode !== "CHOICE" ? [] : chunkChoice ? [chunk!, ...chunkPool.filter((item) => item.english !== chunk!.english).slice(0, 3)].map((item) => ({ id: stage.chunkCode === "HEAR" ? item.english : item.local, label: stage.chunkCode === "HEAR" ? item.english : item.local })) : words.map((item) => ({ id: item.en, label: stage.code === "CL" ? item.en : item.local }));
  return { stageIndex: 0, stepIndex, stageKey: stage.key, kind: stage.kind, mode, code: stage.code, cardNumber: stage.cardNumber, chunkCode: stage.chunkCode ?? null, chunkLocal: chunk && !reviewCheck && ["INTRO", "VISIBLE"].includes(stage.chunkCode!) ? chunk.local : null, sentenceMode: stage.sentenceMode ?? null, sentenceLocal: stage.kind === "BAG_SENTENCE" && stage.sentenceMode === "VISIBLE" ? sentence!.local : null, prompt, speakTarget: mode === "SPEAK" ? target : null, audioTarget: chunk && !reviewCheck && ["INTRO", "HEAR"].includes(stage.chunkCode!) ? chunk.english : null, options, assembleWords: mode === "ASSEMBLE" ? (chunk ? chunk.english : sentence!.english).replace(/[.!?]$/, "").split(" ").reverse() : [], storyLines: recall ? story.slice(0, stage.storyIndex!).map((line) => line.local) : [], stepCount: stage.requiredSteps, failedLine, hintEnglish: failedLine && chunk ? chunk.english : null, reviewCheck };
}

const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");

export function BagStoryBlock({ lessonId, settings, introWords = [], contentLocale = "uk", canSaveProgress, progressHydrated = true, resumeOnEntry = false, guestStageLimit, onGuestLimitReached, onAttemptResolved, onProgress, onComplete }: {
  lessonId: string; settings?: unknown; introWords?: IntroWord[]; contentLocale?: "uk" | "ru"; canSaveProgress: boolean; progressHydrated?: boolean; resumeOnEntry?: boolean;
  guestStageLimit?: number;
  onGuestLimitReached?: (resumeIndex: number) => void;
  onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; isFinalExercise: boolean; difficulty?: number; streakTone?: string | null; streakMilestone?: number | null; streakMilestones?: number[]; lessonAnswerStreak?: { current: number; recoverable: number } }) => void;
  onProgress?: (progress: { completedStages: number; totalStages: number }) => void;
  onComplete?: () => void;
}) {
  const locale = contentLocale;
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [pending, setPending] = useState<State | null>(null);
  const [answer, setAnswer] = useState("");
  const [assembly, setAssembly] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rewardExperience, setRewardExperience] = useState<number | null>(null);
  const [rewardLevelUp, setRewardLevelUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [speechRetry, setSpeechRetry] = useState(false);
  const [guestPosition, setGuestPosition] = useState({ stageIndex: 0, stepIndex: 0, incorrectAttempts: 0, masteredChunks: [] as string[], relearningChunks: [] as string[], failedLine: false });
  const [guestLoaded, setGuestLoaded] = useState(false);
  const guestWallSignalled = useRef(false);
  const pendingGuestPosition = useRef<typeof guestPosition | null>(null);
  const submitLock = useRef(false);
  const completeSignalled = useRef(false);
  const words = useMemo(() => introWords.map((item) => ({ en: item.word.lemma, local: vocabularyMasteryTranslation(settings, item.word.lemma, locale, item.word.meanings[0]?.translation ?? item.word.meanings[0]?.definition ?? item.word.lemma) })), [introWords, settings, locale]);
  const guestStages = useMemo(() => isBagStorySettings(settings) && settings.reviewAll === true ? buildBagReviewStages(words.map((word) => word.en)) : buildBagStoryStages(words.map((word) => word.en), words.map((word) => word.en)), [settings, words]);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(`krin:bag-story-guest:${lessonId}`) ?? "null") as { stageIndex?: number; stepIndex?: number; masteredChunks?: string[]; relearningChunks?: string[] } | null;
      if (saved && Number.isInteger(saved.stageIndex) && Number.isInteger(saved.stepIndex)) setGuestPosition((current) => ({ ...current, stageIndex: Math.max(0, Math.min(saved.stageIndex!, guestStages.length)), stepIndex: Math.max(0, saved.stepIndex!), masteredChunks: Array.isArray(saved.masteredChunks) ? saved.masteredChunks : [], relearningChunks: Array.isArray(saved.relearningChunks) ? saved.relearningChunks : [] }));
    } catch { /* Browser storage is optional. */ }
    setGuestLoaded(true);
  }, [guestStages.length, lessonId]);
  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/bag-story?locale=${locale}`, { cache: "no-store" });
      const result = await response.json() as { data?: State; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Unable to load lesson");
      setState(result.data);
      window.localStorage.removeItem(`krin:bag-story-guest:${lessonId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load lesson"); }
  }, [lessonId, locale]);
  // The lesson shell saves the active block on Save & exit. Reopening that
  // block should restore the server's exact card/line, not repeat its intro.
  useEffect(() => { if (canSaveProgress && progressHydrated && resumeOnEntry) setStarted(true); }, [canSaveProgress, progressHydrated, resumeOnEntry]);
  useEffect(() => { if (started && canSaveProgress) void load(); }, [started, canSaveProgress, load]);
  const guestStage = guestStages[guestPosition.stageIndex];
  const guestChunk = guestStage?.kind === "BAG_CHUNK" ? bagStory(words[guestStage.wordOrdinal]!.en, words[guestStage.wordOrdinal]!.local, locale)[guestStage.storyIndex! - 1]!.chunks[guestStage.chunkIndex!]! : null;
  const guestReviewCheck = guestStage ? bagQuickCheckEligible(guestStage, guestChunk?.english ?? null, guestPosition.masteredChunks, guestPosition.relearningChunks) : false;
  const guestTask = guestStage ? { ...guestCard(guestStage, guestPosition.stepIndex, words, locale, guestReviewCheck, guestPosition.failedLine), stageIndex: guestPosition.stageIndex } : null;
  const guestState: State = { completed: guestPosition.stageIndex >= guestStages.length, progress: { completedStages: guestPosition.stageIndex, totalStages: guestStages.length, incorrectAttempts: guestPosition.incorrectAttempts }, task: guestTask, speedWindow: null };
  const displayState = canSaveProgress ? state : guestState;
  const completedStages = displayState?.progress.completedStages;
  const totalStages = displayState?.progress.totalStages;
  useEffect(() => {
    if (started && completedStages !== undefined && totalStages !== undefined) onProgress?.({ completedStages, totalStages });
  }, [started, completedStages, totalStages, onProgress]);
  const task = displayState?.task;
  const guestLimit = Math.min(guestStageLimit ?? guestStages.length, guestStages.length);
  useEffect(() => {
    if (canSaveProgress || !started || !guestLoaded || guestPosition.stageIndex < guestLimit || guestPosition.stageIndex >= guestStages.length || guestWallSignalled.current) return;
    guestWallSignalled.current = true;
    onGuestLimitReached?.(guestPosition.stageIndex);
  }, [canSaveProgress, guestLoaded, guestLimit, guestPosition.stageIndex, guestStages.length, onGuestLimitReached, started]);
  useEffect(() => { setAnswer(""); setAssembly([]); setFeedback(null); setSpeechRetry(false); }, [task?.stageKey, task?.stepIndex]);
  useEffect(() => { if (!state?.speedWindow || pending) return; const timer = window.setInterval(() => setClock(Date.now()), 250); return () => window.clearInterval(timer); }, [state?.speedWindow, pending]);

  async function submit(value: string) {
    if (!task || busy || pending) return;
    if (!canSaveProgress) {
      if (guestPosition.stageIndex >= guestLimit) { onGuestLimitReached?.(guestPosition.stageIndex); return; }
      const word = words[guestStage!.wordOrdinal]!;
      const story = bagStory(word.en, word.local, locale);
      const sentence = guestStage!.storyIndex ? story[guestStage!.storyIndex - 1]! : null;
      const chunk = guestStage!.kind === "BAG_CHUNK" ? sentence!.chunks[guestStage!.chunkIndex!]! : null;
      const target = chunk ? chunk.english : guestStage!.kind === "BAG_RECALL" || guestStage!.code === "RECALL" ? story[guestPosition.stepIndex]!.english : guestStage!.kind === "BAG_SENTENCE" || guestStage!.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.english : guestStage!.code === "TE" || guestStage!.code === "CE" ? word.local : word.en;
      const expected = task.mode === "CHOICE" ? chunk ? guestStage!.chunkCode === "MEANING" ? chunk.local : chunk.english : word.en : target;
      const correct = task.mode === "SPEAK" ? assessPronunciation(target, value).similarity >= .9 : normalized(value) === normalized(expected);
      if (!correct) { setGuestPosition((current) => ({ ...current, incorrectAttempts: current.incorrectAttempts + 1, failedLine: true, relearningChunks: guestReviewCheck ? [...current.relearningChunks, guestStage!.key] : current.relearningChunks })); setFeedback(locale === "uk" ? "Спробуйте ще раз." : "Попробуйте ещё раз."); return; }
      const nextStep = guestPosition.stepIndex + 1;
      if (nextStep < task.stepCount) { setGuestPosition((current) => ({ ...current, stepIndex: nextStep, failedLine: false })); return; }
      const nextIndex = guestPosition.stageIndex + (guestReviewCheck ? BAG_CHUNK_STAGE_SPAN : 1);
      const chunkKey = chunk ? bagChunkKey(chunk.english) : null;
      const nextPosition = { ...guestPosition, stageIndex: nextIndex, stepIndex: 0, failedLine: false, masteredChunks: chunkKey && guestStage!.chunkCode === "RECALL_3" && !guestPosition.masteredChunks.includes(chunkKey) ? [...guestPosition.masteredChunks, chunkKey] : guestPosition.masteredChunks, relearningChunks: guestStage!.chunkCode === "RECALL_3" ? guestPosition.relearningChunks.filter((key) => key !== guestStage!.key.replace(/-8$/, "-0")) : guestPosition.relearningChunks };
      pendingGuestPosition.current = nextPosition;
      try { window.localStorage.setItem(`krin:bag-story-guest:${lessonId}`, JSON.stringify(nextPosition)); } catch { /* Optional. */ }
      setPending({ completed: nextIndex >= guestStages.length, progress: { ...guestState.progress, completedStages: nextIndex }, task: null });
      if (nextIndex >= guestLimit && nextIndex < guestStages.length) { guestWallSignalled.current = true; onGuestLimitReached?.(nextIndex); }
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/bag-story`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageIndex: task.stageIndex, stepIndex: task.stepIndex, locale, answer: value, speedWindowId: state?.speedWindow?.id }) });
      const result = await response.json() as { data?: Submission; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Unable to check answer");
      const next = result.data;
      setRewardExperience(next.motivationReward?.awarded ? next.motivationReward.experience : null);
      setRewardLevelUp(Boolean(next.motivationReward?.levelUp));
      if (!next.isCorrect) {
        setState({ ...next.state, speedWindow: null });
        setFeedback(next.state.task?.hintEnglish ? locale === "uk" ? "Спробуйте ще раз. Можна прослухати зразок." : "Попробуйте ещё раз. Можно прослушать образец." : locale === "uk" ? "Спробуйте ще раз." : "Попробуйте ещё раз.");
      } else if (next.stageCompleted) {
        setPending(next.state);
        setFeedback(next.motivationReward?.awarded ? null : locale === "uk" ? "Правильно!" : "Правильно!");
      } else {
        // A multi-line story stays on one card while the server persists the
        // current line. Only the active line advances.
        setState({ ...next.state, speedWindow: state?.speedWindow });
        setFeedback(next.motivationReward?.awarded ? null : locale === "uk" ? "Рядок зараховано." : "Строка засчитана.");
      }
      if (next.exerciseId && next.motivationReward) {
        onAttemptResolved?.({ exerciseId: next.exerciseId, isCorrect: next.isCorrect, isFinalExercise: false, difficulty: 1, streakTone: next.motivationReward.streak?.tone ?? null, streakMilestone: next.motivationReward.streak?.activated ? next.motivationReward.streak.modeStart : null, streakMilestones: next.motivationReward.streakMilestones, lessonAnswerStreak: next.motivationReward.lessonAnswerStreak });
      }
      if (next.motivationReward?.awarded) notifyMotivationUpdated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to check answer"); }
    finally { submitLock.current = false; setBusy(false); }
  }

  if (canSaveProgress && (!progressHydrated || resumeOnEntry && !started)) return <div className={styles.loading}>{locale === "uk" ? "Завантажуємо картку…" : "Загружаем карточку…"}</div>;
  if (!started) return <div className={styles.intro}>
    <h3>{locale === "uk" ? `${words.length} фраз цього уроку` : `${words.length} фраз этого урока`}</h3>
    <ul className={styles.introWords}>{words.map((word, index) => <li key={`${word.en}-${index}`}><span>{index + 1}</span><strong>{word.en}</strong><em>{word.local}</em></li>)}</ul>
    <button className={styles.start} type="button" onClick={() => setStarted(true)}>{locale === "uk" ? "Почати" : "Начать"}</button>
  </div>;
  if (!canSaveProgress && !guestLoaded) return null;
  if (!displayState) return <div className={styles.mastery}>{error ? <p className={styles.error}>{error}</p> : <p className={styles.loading}>{locale === "uk" ? "Завантажуємо картку…" : "Загружаем карточку…"}</p>}<button className={styles.start} type="button" onClick={() => void load()}>{locale === "uk" ? "Повторити" : "Повторить"}</button></div>;
  if (displayState.completed) return <div className={styles.completed}><span>✓</span><h3>{locale === "uk" ? "Урок завершено" : "Урок завершён"}</h3><button className={styles.submit} data-lesson-enter-next="task" type="button" onClick={() => { if (completeSignalled.current) return; completeSignalled.current = true; onComplete?.(); }}>{locale === "uk" ? "Готово" : "Готово"}</button></div>;
  if (!task) return null;
  const hiddenSpeech = task.reviewCheck || task.kind === "BAG_RECALL" || task.kind === "BAG_REVIEW" && task.code === "RECALL" || task.code === "P" && task.cardNumber !== 1 || task.kind === "BAG_CHUNK" && ["RECALL_1", "RECALL_2", "RECALL_3"].includes(task.chunkCode ?? "") || task.kind === "BAG_SENTENCE" && task.sentenceMode === "HIDDEN";
  const elapsed = displayState.speedWindow ? Math.max(0, (clock - new Date(displayState.speedWindow.openedAt).getTime()) / 1000) : Number.POSITIVE_INFINITY;
  const speedPercent = remainingExerciseSpeedPercent(elapsed, displayState.speedWindow?.windowSeconds);
  const speedXp = experienceForExerciseSpeed(elapsed, displayState.speedWindow?.windowSeconds);
  return <div className={`${styles.mastery} ${styles.vocabularyCard} ${styles.bagStoryCard} ${task.mode === "ASSEMBLE" ? styles.assemblyCard : ""}`}>
    {rewardExperience !== null ? <div className="lesson-correct-celebration" role="status" aria-live="polite"><strong>{learnerAnswerFeedback(locale).xpAwarded(rewardExperience)}</strong>{rewardLevelUp ? <span>Level up!</span> : null}</div> : null}
    <div className={styles.overallTrack} aria-hidden="true"><span style={{ width: `${Math.max(2, displayState.progress.completedStages / displayState.progress.totalStages * 100)}%` }} /></div>
    {canSaveProgress ? <div className={styles.series}><div><strong>{locale === "uk" ? "Нагорода за швидкість" : "Награда за скорость"}</strong><span>+{speedXp} XP</span></div><div className={styles.seriesTrack}><span style={{ width: `${speedPercent}%` }} /></div></div> : null}
    {task.storyLines.length ? <ol className={styles.promptList}>{task.storyLines.map((line, index) => <li key={`${index}-${line}`} className={styles.promptRow} style={{ opacity: index > task.stepIndex ? .55 : 1 }}><span className={styles.prompt}>{index + 1}. {line}</span>{index < task.stepIndex ? <strong>✓</strong> : null}</li>)}</ol> : <p className={styles.word}>{task.prompt}</p>}
    {task.chunkLocal || task.sentenceLocal ? <p className={styles.wordTranslation}>{task.chunkLocal ?? task.sentenceLocal}</p> : null}
    {task.audioTarget ? <button className={styles.submit} type="button" onClick={() => speak(task.audioTarget!)}>🔊 {locale === "uk" ? "Послухати" : "Послушать"}</button> : null}
    {task.mode === "SPEAK" && task.speakTarget ? <PronunciationCoach key={`${task.stageKey}-${task.stepIndex}`} word={task.speakTarget} compact locale={locale} concealWord={hiddenSpeech} largeTranscript allowListen={!hiddenSpeech || task.failedLine || speechRetry} onAssessment={({ value, transcript }) => { if (value.verdict === "MATCH" || value.verdict === "CLOSE" && value.similarity >= .9) void submit(transcript); else { setSpeechRetry(true); setFeedback(locale === "uk" ? "Розпізнавання невпевнене. Повторіть запис — це не обриває серію." : "Распознавание неуверенное. Повторите запись — это не обрывает серию."); } }} /> : null}
    {task.mode === "CHOICE" ? <div className={`${styles.promptList} ${styles.choiceGrid}`}>{task.options.map((option) => <button className={styles.promptRow} key={option.id} disabled={busy || Boolean(pending)} type="button" onClick={() => void submit(option.id)}>{option.label}</button>)}</div> : null}
    {task.mode === "TYPE" ? <form className={styles.translationForm} onSubmit={(event) => { event.preventDefault(); void submit(answer); }}><div className={styles.promptRow}><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { applyAnswerKeyboardLayout(event, task.code === "TE" ? locale : "en", setAnswer); }} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} lang={task.code === "TE" ? locale : "en"} placeholder={locale === "uk" ? "Впишіть відповідь" : "Впишите ответ"} /></div><button className={styles.submit} disabled={busy || !answer.trim() || Boolean(pending)}>{locale === "uk" ? "Перевірити" : "Проверить"}</button></form> : null}
    {task.mode === "ASSEMBLE" ? <div className={styles.translationForm}><div className={`${styles.promptRow} ${styles.assemblyAnswer}`}>{assembly.map((index) => task.assembleWords[index]).join(" ") || "…"}</div>{!pending ? <><div className={`${styles.formActions} ${styles.assemblyWords}`}>{task.assembleWords.map((part, index) => assembly.includes(index) ? null : <button className={styles.wordTile} type="button" key={`${part}-${index}`} disabled={busy} onClick={() => setAssembly((current) => [...current, index])}>{part}</button>)}</div><div className={styles.assemblyControls}><button className={styles.submit} type="button" disabled={!assembly.length || busy} onClick={() => void submit(assembly.map((index) => task.assembleWords[index]).join(" "))}>{locale === "uk" ? "Перевірити" : "Проверить"}</button><button className={styles.clearButton} type="button" disabled={!assembly.length || busy} onClick={() => setAssembly([])}>{locale === "uk" ? "Очистити" : "Очистить"}</button></div></> : null}</div> : null}
    {task.hintEnglish || speechRetry && task.speakTarget ? <p className={styles.instruction}>{task.hintEnglish ?? task.speakTarget} <button type="button" onClick={() => speak(task.hintEnglish ?? task.speakTarget!)}>🔊</button><button type="button" onClick={() => speak(task.hintEnglish ?? task.speakTarget!, true)}>🐢</button></p> : null}
    {feedback ? <p className={styles.feedbackSuccess} role="status">{feedback}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {pending ? <div className={styles.bagActionRow}><button className={`${styles.submit} ${styles.bagNextButton}`} data-lesson-enter-next="task" type="button" onClick={() => { setPending(null); setRewardExperience(null); if (canSaveProgress) void load(); else if (pendingGuestPosition.current) { setGuestPosition(pendingGuestPosition.current); pendingGuestPosition.current = null; } }}>{locale === "uk" ? "Далі →" : "Далее →"}</button></div> : null}
  </div>;
}
