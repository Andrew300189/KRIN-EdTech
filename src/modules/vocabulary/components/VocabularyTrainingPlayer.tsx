"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import styles from "./VocabularyTrainingPlayer.module.css";

type TrainingItem = { id: string; exerciseType: string; payload: { prompt?: string; mode?: string; options?: string[]; tiles?: string[]; separator?: string; direction?: string }; status: string; order: number };
type TrainingSession = { id: string; status: string; totalItems: number; completedItems: number; correctItems: number; incorrectItems: number; items: TrainingItem[] };

async function loadTrainingSession(sessionId: string) {
  const response = await fetch(`/api/profile/vocabulary/sessions/${sessionId}`, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json() as { data?: TrainingSession };
  return payload.data ?? null;
}

export function VocabularyTrainingPlayer({ sessionId, compact = false, onCompleted, cycleLength }: { sessionId: string; compact?: boolean; onCompleted?: () => void; cycleLength?: number }) {
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<Array<{ id: number; value: string }>>([]);
  const [round, setRound] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);
  const draggedTile = useRef<number | null>(null);
  const refresh = useCallback(async () => setSession(await loadTrainingSession(activeSessionId)), [activeSessionId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const item = session?.items.find((entry) => entry.status === "PENDING");
  useEffect(() => { setAnswer(""); setSelectedTiles([]); setFeedback(null); setErrorMessage(null); startedAt.current = Date.now(); }, [item?.id]);
  useEffect(() => {
    let live = true;
    const noteInteraction = () => { interactionCount.current += 1; };
    void fetch("/api/learning/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "VOCABULARY" }) }).then((response) => response.ok ? response.json() : null).then((payload: { data?: { id?: string } } | null) => { if (live) learningSessionId.current = payload?.data?.id ?? null; }).catch(() => undefined);
    window.addEventListener("pointerdown", noteInteraction); window.addEventListener("keydown", noteInteraction);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientTimestamp: new Date().toISOString(), interactionCount: interactionCount.current }) }).catch(() => undefined); }, 30_000);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("pointerdown", noteInteraction); window.removeEventListener("keydown", noteInteraction); if (learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined); };
  }, []);

  async function submit(value?: string) {
    if (!item || sending) return;
    const submitted = value ?? answer;
    if (!submitted.trim()) return;
    setSending(true); setFeedback(null); setErrorMessage(null);
    try {
      const response = await fetch(`/api/profile/vocabulary/session-items/${item.id}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submittedAnswer: submitted, responseTimeSeconds: Math.round((Date.now() - startedAt.current) / 1000), confidence: 2 }) });
      const payload = await response.json() as { data?: { isCorrect: boolean; correctAnswer?: string; sessionCompleted: boolean; motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean } }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to check answer");
      setFeedback({ correct: payload.data.isCorrect, text: payload.data.isCorrect ? "Отлично! Правильный ответ." : `Правильный ответ: ${payload.data.correctAnswer ?? "—"}` });
      if (payload.data.motivationReward?.awarded) { const reward = payload.data.motivationReward; setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Новый уровень!" : "Награда за словарь", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]); }
      window.setTimeout(() => { void refresh().then(() => { setSending(false); if (payload.data?.sessionCompleted) onCompleted?.(); }); }, 850);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to submit answer"); setSending(false); }
  }

  async function markLearned() {
    if (!item || sending) return;
    setSending(true); setErrorMessage(null);
    try {
      const response = await fetch(`/api/profile/vocabulary/session-items/${item.id}/mastered`, { method: "POST" });
      const payload = await response.json() as { data?: { sessionCompleted: boolean }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to mark the word as learned");
      setFeedback({ correct: true, text: "Слово перенесено в выученные." });
      window.setTimeout(() => { void refresh().then(() => { setSending(false); if (payload.data?.sessionCompleted) onCompleted?.(); }); }, 650);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to mark the word as learned"); setSending(false); }
  }

  async function startNextRound() {
    if (!cycleLength || round >= cycleLength || sending) return;
    setSending(true); setErrorMessage(null);
    try {
      const response = await fetch("/api/profile/vocabulary/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "USER_SELECTED" }) });
      const payload = await response.json() as { data?: TrainingSession | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create the next round");
      if (!payload.data) { setErrorMessage("Все слова уже выучены. Добавьте новые слова в личный словарь."); return; }
      setRound((value) => value + 1); setActiveSessionId(payload.data.id); setSession(payload.data); setRewardEvents([]);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to create the next round"); }
    finally { setSending(false); }
  }

  const tileSource = Array.isArray(item?.payload.tiles) ? item.payload.tiles : [];
  const usedTileIds = new Set(selectedTiles.map(({ id }) => id));
  function addTile(id: number, value: string) { if (!sending && !usedTileIds.has(id)) setSelectedTiles((current) => [...current, { id, value }]); }
  function moveTile(targetIndex: number) { const sourceIndex = draggedTile.current; if (sourceIndex === null || sourceIndex === targetIndex) return; setSelectedTiles((current) => { const next = [...current]; const [moved] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, moved); return next; }); draggedTile.current = null; }

  if (!session) return <div className={styles.loading} aria-live="polite">Загружаем тренировку…</div>;
  if (!item) return <section className={styles.completeCard}><RewardNotification events={rewardEvents} /><span className={styles.completeMark}>✓</span><p className={styles.kicker}>{cycleLength ? `Раунд ${round} из ${cycleLength}` : "Тренировка завершена"}</p><h2>Раунд пройден</h2><p>Правильно: <strong>{session.correctItems}</strong> · Ошибок: <strong>{session.incorrectItems}</strong></p>{cycleLength && round < cycleLength ? <button type="button" className={styles.primaryButton} disabled={sending} onClick={() => void startNextRound()}>Следующий раунд</button> : null}{round >= (cycleLength ?? Number.POSITIVE_INFINITY) ? <p className={styles.cycleComplete}>Цикл из 100 раундов завершён.</p> : null}{errorMessage ? <p className={styles.errorText} role="alert">{errorMessage}</p> : null}</section>;

  const options = Array.isArray(item.payload.options) ? item.payload.options : [];
  const tileAnswer = selectedTiles.map(({ value }) => value).join(item.payload.separator ?? "");
  const progress = session.totalItems ? Math.round((session.completedItems / session.totalItems) * 100) : 0;
  return <section className={`${styles.player} ${compact ? styles.compact : ""}`}><RewardNotification events={rewardEvents} /><div className={styles.topline}><div><p className={styles.kicker}>{cycleLength ? `Раунд ${round} из ${cycleLength}` : "Повторение слов"}</p><strong>Задание {session.completedItems + 1} из {session.totalItems}</strong></div><button type="button" className={styles.learnedButton} disabled={sending} onClick={() => void markLearned()}>✓ Выучил</button></div><div className={styles.progressTrack} aria-label={`Выполнено ${progress}%`}>{Array.from({ length: session.totalItems }, (_, index) => <span key={index} className={index < session.completedItems ? styles.progressDone : index === session.completedItems ? styles.progressCurrent : ""} />)}</div><div className={styles.taskCard}><span className={styles.direction}>{item.payload.direction === "EN_RU" ? "English → Русский" : "Русский → English"}</span><h2>{item.payload.prompt ?? "Выполните задание"}</h2>{options.length ? <div className={styles.optionGrid}>{options.map((option) => <button key={option} type="button" disabled={sending} onClick={() => void submit(option)}>{option}</button>)}</div> : null}{item.payload.mode === "tiles" ? <div className={styles.tilesExercise}><div className={styles.answerTray} aria-label="Собранный ответ">{selectedTiles.length ? selectedTiles.map((tile, index) => <button key={tile.id} type="button" draggable onDragStart={() => { draggedTile.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => moveTile(index)} onClick={() => setSelectedTiles((current) => current.filter(({ id }) => id !== tile.id))}>{tile.value}</button>) : <span>Перетащите или нажмите на кубики</span>}</div><div className={styles.tileBank}>{tileSource.map((tile, index) => <button key={`${tile}-${index}`} type="button" disabled={sending || usedTileIds.has(index)} onClick={() => addTile(index, tile)}>{tile}</button>)}</div><button type="button" className={styles.primaryButton} disabled={sending || !tileAnswer.trim()} onClick={() => void submit(tileAnswer)}>Проверить</button></div> : null}{!options.length && item.payload.mode !== "tiles" ? <div className={styles.textExercise}><label htmlFor={`answer-${item.id}`}>Ваш ответ</label><input id={`answer-${item.id}`} autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} placeholder="Введите перевод" disabled={sending} /><button type="button" className={styles.primaryButton} disabled={sending || !answer.trim()} onClick={() => void submit()}>Проверить</button></div> : null}{feedback ? <div className={`${styles.feedback} ${feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong}`} role="status">{feedback.text}</div> : null}{errorMessage ? <p className={styles.errorText} role="alert">{errorMessage}</p> : null}</div></section>;
}
