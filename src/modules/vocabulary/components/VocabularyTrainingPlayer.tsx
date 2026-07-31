"use client";

import { useEffect, useRef, useState } from "react";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";

type TrainingItem = { id: string; exerciseType: string; payload: { prompt?: string; mode?: string; options?: string[] }; status: string; order: number };
type TrainingSession = { id: string; status: string; totalItems: number; completedItems: number; correctItems: number; incorrectItems: number; items: TrainingItem[] };

export function VocabularyTrainingPlayer({ sessionId, compact = false, onCompleted }: { sessionId: string; compact?: boolean; onCompleted?: () => void }) {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const startedAt = useRef(Date.now());
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);
  useEffect(() => { void fetch(`/api/profile/vocabulary/sessions/${sessionId}`).then((response) => response.ok ? response.json() : null).then((payload: { data?: TrainingSession } | null) => setSession(payload?.data ?? null)); }, [sessionId]);
  useEffect(() => {
    let live = true;
    const noteInteraction = () => { interactionCount.current += 1; };
    void fetch("/api/learning/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "VOCABULARY" }) }).then((response) => response.ok ? response.json() : null).then((payload: { data?: { id?: string } } | null) => { if (live) learningSessionId.current = payload?.data?.id ?? null; }).catch(() => undefined);
    window.addEventListener("pointerdown", noteInteraction); window.addEventListener("keydown", noteInteraction);
    const timer = window.setInterval(() => { if (document.visibilityState !== "visible" || !learningSessionId.current) return; void fetch(`/api/learning/sessions/${learningSessionId.current}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientTimestamp: new Date().toISOString(), interactionCount: interactionCount.current }) }).catch(() => undefined); }, 30_000);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("pointerdown", noteInteraction); window.removeEventListener("keydown", noteInteraction); if (learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined); };
  }, []);
  const item = session?.items.find((entry) => entry.status === "PENDING");
  async function submit(value?: string) {
    if (!item) return;
    setSending(true); setFeedback(null);
    try {
      const response = await fetch(`/api/profile/vocabulary/session-items/${item.id}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submittedAnswer: value ?? answer, responseTimeSeconds: Math.round((Date.now() - startedAt.current) / 1000) }) });
      const payload = await response.json() as { data?: { isCorrect: boolean; correctAnswer?: string; sessionCompleted: boolean; motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean } }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to check answer");
      setFeedback(payload.data.isCorrect ? "Correct" : `Correct answer: ${payload.data.correctAnswer ?? "—"}`);
      if (payload.data.motivationReward?.awarded) {
        const reward = payload.data.motivationReward;
        setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "Vocabulary reward", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
      }
      setAnswer(""); startedAt.current = Date.now();
      const updated = await fetch(`/api/profile/vocabulary/sessions/${sessionId}`).then((next) => next.json()) as { data?: TrainingSession };
      setSession(updated.data ?? null);
      if (payload.data.sessionCompleted) onCompleted?.();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to submit answer"); } finally { setSending(false); }
  }
  if (!session) return <p className="text-sm text-slate-600">Loading training…</p>;
  if (!item) return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><RewardNotification events={rewardEvents} /><h2 className="text-xl font-bold text-emerald-950">Training complete</h2><p className="mt-2 text-emerald-900">Correct: {session.correctItems} · Incorrect: {session.incorrectItems}</p></section>;
  const options = Array.isArray(item.payload.options) ? item.payload.options : [];
  return <section className={`rounded-2xl border border-slate-200 bg-white ${compact ? "p-5" : "p-7 shadow-sm"}`}><RewardNotification events={rewardEvents} /><p className="text-sm font-semibold text-blue-700">Review {session.completedItems + 1} of {session.totalItems}</p><h2 className="mt-3 text-xl font-bold text-slate-900">{item.payload.prompt ?? "Answer the vocabulary question"}</h2>{options.length ? <div className="mt-5 grid gap-2">{options.map((option) => <button key={option} type="button" disabled={sending} onClick={() => void submit(option)} className="rounded-lg border border-slate-300 px-4 py-3 text-left font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60">{option}</button>)}</div> : <div className="mt-5"><label className="sr-only" htmlFor={`answer-${item.id}`}>Your answer</label><input id={`answer-${item.id}`} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Type your answer" /><button type="button" disabled={sending || !answer.trim()} onClick={() => void submit()} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">Check answer</button></div>}{feedback ? <p role="status" className="mt-4 text-sm font-semibold text-slate-700">{feedback}</p> : null}</section>;
}
