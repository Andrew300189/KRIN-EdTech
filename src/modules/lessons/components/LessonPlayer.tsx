"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LessonVocabularyPanel } from "@/modules/vocabulary/components/LessonVocabularyPanel";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { LessonBlockRenderer } from "./LessonBlockRenderer";
import { asStringArray, type LessonBlock } from "./lesson-content";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";

type StoredProgress = {
  status: "STARTED" | "COMPLETED";
  completedBlocks: unknown;
  currentBlockId: string | null;
  completionPercent: number;
  score: number;
  grade: number | null;
  hintsUsed: number;
  solutionsOpened: number;
  activeSeconds: number;
  totalSeconds: number;
  motivationReward?: { awarded: boolean; experience: number; coins: number; levelUp: boolean } | null;
};

type LessonWord = {
  wordId: string;
  role: string;
  isRequired: boolean;
  word: {
    lemma: string;
    partOfSpeech: string | null;
    meanings: Array<{ translation: string | null; definition: string }>;
  };
};

type Props = {
  lessonId: string;
  courseSlug: string;
  moduleTitle: string;
  title: string;
  estimatedDuration: number;
  objectives: unknown;
  blocks: LessonBlock[];
  lessons: Array<{ slug: string; title: string; order: number }>;
  currentSlug: string;
  canSaveProgress: boolean;
  vocabulary?: LessonWord[];
  warmUpSessionId?: string | null;
  warmUpRequired?: boolean;
  autoUnlockNextLesson?: boolean;
  isFirstCourseLesson?: boolean;
};

export function LessonPlayer({
  lessonId, courseSlug, moduleTitle, title, estimatedDuration, objectives, blocks, lessons,
  currentSlug, canSaveProgress, vocabulary = [], warmUpSessionId, warmUpRequired = false,
  autoUnlockNextLesson = true,
  isFirstCourseLesson = false,
}: Props) {
  const router = useRouter();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(blocks[0]?.id ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [storedProgress, setStoredProgress] = useState<StoredProgress | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rewardEvents, setRewardEvents] = useState<RewardNotificationEvent[]>([]);
  const [warmUpDone, setWarmUpDone] = useState(!warmUpSessionId);
  const [skippingWarmUp, setSkippingWarmUp] = useState(false);
  const lastSavedSeconds = useRef(0);
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);
  const hasGuestPreviewRef = useRef(false);
  const previewCompleteReported = useRef(false);
  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const objectiveItems = asStringArray(objectives);
  const progressPercent = useMemo(() => blocks.length ? Math.round((completedBlocks.length / blocks.length) * 100) : 0, [blocks.length, completedBlocks.length]);

  const guestPreviewKey = `krin:lesson-preview:${lessonId}`;

  useEffect(() => {
    if (canSaveProgress) {
      if (isFirstCourseLesson) reportFunnelEvent("FIRST_LESSON_START");
      return;
    }
    reportFunnelEvent("PREVIEW_LESSON_START");
  }, [canSaveProgress, isFirstCourseLesson]);

  useEffect(() => {
    if (!canSaveProgress) return;
    try {
      const raw = window.localStorage.getItem(guestPreviewKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { completedBlocks?: unknown; currentBlockId?: unknown; activeSeconds?: unknown };
      const restoredBlocks = asStringArray(saved.completedBlocks);
      const restoredCurrentBlock = typeof saved.currentBlockId === "string" ? saved.currentBlockId : blocks[0]?.id ?? null;
      const restoredSeconds = typeof saved.activeSeconds === "number" && Number.isFinite(saved.activeSeconds) ? Math.max(0, Math.floor(saved.activeSeconds)) : 0;
      hasGuestPreviewRef.current = true;
      setCompletedBlocks(restoredBlocks);
      setCurrentBlockId(restoredCurrentBlock);
      setElapsedSeconds(restoredSeconds);
      void fetch(`/api/learning/lessons/${lessonId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedBlockIds: restoredBlocks, currentBlockId: restoredCurrentBlock, activeSeconds: restoredSeconds, complete: false }),
      }).then((response) => {
        if (response.ok) window.localStorage.removeItem(guestPreviewKey);
      }).catch(() => undefined);
    } catch {
      window.localStorage.removeItem(guestPreviewKey);
    }
  }, [blocks, canSaveProgress, guestPreviewKey, lessonId]);

  useEffect(() => {
    if (canSaveProgress) return;
    try {
      window.localStorage.setItem(guestPreviewKey, JSON.stringify({ completedBlocks, currentBlockId, activeSeconds: elapsedSeconds }));
    } catch {
      // Storage is optional; the lesson remains usable in private browsing.
    }
  }, [canSaveProgress, completedBlocks, currentBlockId, elapsedSeconds, guestPreviewKey]);

  useEffect(() => {
    if (!canSaveProgress) return;
    let live = true;
    void fetch(`/api/learning/lessons/${lessonId}/progress`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { data?: StoredProgress | null } | null) => {
        if (!live || !payload?.data || hasGuestPreviewRef.current) return;
        const saved = payload.data;
        setStoredProgress(saved);
        setCompletedBlocks(asStringArray(saved.completedBlocks));
        setCurrentBlockId(saved.currentBlockId ?? blocks[0]?.id ?? null);
        setElapsedSeconds(saved.activeSeconds ?? 0);
        lastSavedSeconds.current = saved.activeSeconds ?? 0;
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [blocks, canSaveProgress, lessonId]);

  useEffect(() => {
    if (!canSaveProgress) return;
    let live = true;
    const noteInteraction = () => { interactionCount.current += 1; };
    const create = async () => {
      const response = await fetch("/api/learning/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "LESSON", lessonId }) });
      const payload = await response.json().catch(() => null) as { data?: { id?: string } } | null;
      if (live) learningSessionId.current = payload?.data?.id ?? null;
    };
    const heartbeat = () => {
      if (!live || document.visibilityState !== "visible" || !learningSessionId.current) return;
      void fetch(`/api/learning/sessions/${learningSessionId.current}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientTimestamp: new Date().toISOString(), interactionCount: interactionCount.current }) }).catch(() => undefined);
    };
    void create();
    window.addEventListener("pointerdown", noteInteraction);
    window.addEventListener("keydown", noteInteraction);
    window.addEventListener("scroll", noteInteraction, { passive: true });
    const timer = window.setInterval(heartbeat, 30_000);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("pointerdown", noteInteraction); window.removeEventListener("keydown", noteInteraction); window.removeEventListener("scroll", noteInteraction); if (learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined); };
  }, [canSaveProgress, lessonId]);

  useEffect(() => {
    // This is an informative display clock only. Server-side heartbeats remain
    // the source of truth for saved active time and pause while hidden.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function persistProgress(complete = false) {
    if (!canSaveProgress) return;
    lastSavedSeconds.current = elapsedSeconds;
    setSaveError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedBlockIds: completedBlocks, currentBlockId, activeSeconds: 0, complete }),
    });
    const payload = await response.json() as { data?: StoredProgress; error?: string };
    if (!response.ok || !payload.data) {
      setSaveError(payload.error ?? "Unable to save progress.");
      return;
    }
    setStoredProgress(payload.data);
    if (payload.data.motivationReward?.awarded) {
      const reward = payload.data.motivationReward;
      setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "Lesson reward", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
    }
    if (complete && learningSessionId.current) {
      void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined);
    }
    if (complete && payload.data.status === "COMPLETED" && isFirstCourseLesson) {
      reportFunnelEvent("FIRST_LESSON_COMPLETE");
    }
    // The route still performs the server-side prerequisite and subscription
    // check. Navigation only happens after progress was durably saved.
    if (complete && payload.data.status === "COMPLETED" && autoUnlockNextLesson && nextLesson) {
      router.push(`/courses/${courseSlug}/lessons/${nextLesson.slug}`);
    }
  }

  useEffect(() => {
    if (!canSaveProgress || elapsedSeconds === 0 || elapsedSeconds % 30 !== 0) return;
    void persistProgress();
  // Progress is deliberately persisted at the clock boundary, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, canSaveProgress]);

  function toggleBlock(blockId: string) {
    setCurrentBlockId(blockId);
    setCompletedBlocks((current) => {
      const next = current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId];
      if (!canSaveProgress && !previewCompleteReported.current && blocks.length > 0 && next.length === blocks.length) {
        previewCompleteReported.current = true;
        reportFunnelEvent("PREVIEW_LESSON_COMPLETE");
      }
      return next;
    });
  }

  async function skipWarmUp() {
    if (!warmUpSessionId) return;
    setSkippingWarmUp(true);
    try {
      const response = await fetch(`/api/profile/vocabulary/sessions/${warmUpSessionId}`, { method: "DELETE" });
      if (response.ok) setWarmUpDone(true);
    } finally {
      setSkippingWarmUp(false);
    }
  }

  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const showWarmUp = Boolean(warmUpSessionId && !warmUpDone);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <RewardNotification events={rewardEvents} />
      <nav className="text-sm font-medium text-blue-700"><Link href={`/courses/${courseSlug}`}>← {moduleTitle}</Link></nav>
      <header className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Lesson {currentIndex >= 0 ? currentIndex + 1 : ""}</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600">Estimated time: {estimatedDuration || "—"} minutes · Active time: {formattedTime}</p>
        {canSaveProgress ? <p className="mt-2 text-sm font-medium text-slate-700">Progress: {storedProgress?.completionPercent ?? progressPercent}% · Score: {storedProgress?.score ?? 0}{storedProgress?.grade ? ` · Grade ${storedProgress.grade}/5` : ""}</p> : null}
        {objectiveItems.length > 0 ? <div className="mt-5"><h2 className="font-semibold text-slate-900">Learning objectives</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{objectiveItems.map((objective) => <li key={objective}>{objective}</li>)}</ul></div> : null}
      </header>

      {showWarmUp ? (
        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Before the lesson</p>
          <h2 className="mt-1 text-2xl font-bold text-amber-950">Quick warm-up</h2>
          <p className="mt-2 text-amber-900">Review a few words selected from your previous learning progress.</p>
          <div className="mt-5"><VocabularyTrainingPlayer sessionId={warmUpSessionId!} compact onCompleted={() => setWarmUpDone(true)} /></div>
          {!warmUpRequired ? <button type="button" disabled={skippingWarmUp} onClick={() => void skipWarmUp()} className="mt-4 text-sm font-semibold text-amber-900 underline disabled:opacity-50">{skippingWarmUp ? "Skipping…" : "Skip warm-up"}</button> : null}
        </section>
      ) : (
        <>
          <LessonVocabularyPanel lessonId={lessonId} words={vocabulary} />
          <div className="mt-7 space-y-5">{blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} completed={completedBlocks.includes(block.id)} onToggleComplete={toggleBlock} canSaveProgress={canSaveProgress} />)}</div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {previousLesson ? <Link className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" href={`/courses/${courseSlug}/lessons/${previousLesson.slug}`}>← {previousLesson.title}</Link> : <span />}
            <button type="button" onClick={() => void persistProgress(true)} disabled={!canSaveProgress} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">Complete lesson</button>
            {nextLesson ? <Link className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" href={`/courses/${courseSlug}/lessons/${nextLesson.slug}`}>{nextLesson.title} →</Link> : <span />}
          </div>
        </>
      )}
      {saveError ? <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p> : null}
      {!canSaveProgress ? <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">You are trying a real public lesson. Answers can be checked now; create an account after exploring to save this lesson and continue from the same place. <Link className="font-semibold underline" href={`/register?next=${encodeURIComponent(`/courses/${courseSlug}/lessons/${currentSlug}`)}`}>Create an account</Link> or <Link className="font-semibold underline" href={`/login?next=${encodeURIComponent(`/courses/${courseSlug}/lessons/${currentSlug}`)}`}>sign in</Link>.</p> : null}
    </main>
  );
}
