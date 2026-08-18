"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LessonVocabularyPanel } from "@/modules/vocabulary/components/LessonVocabularyPanel";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { RewardNotification, type RewardNotificationEvent } from "@/modules/motivation/components/RewardNotification";
import { LessonBlockRenderer } from "./LessonBlockRenderer";
import { asObject, asStringArray, type LessonBlock } from "./lesson-content";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";
import styles from "./FocusLessonPlayer.module.css";

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
  word: { lemma: string; partOfSpeech: string | null; meanings: Array<{ translation: string | null; definition: string }> };
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
  /** Uses the same learner player but keeps draft answers in the browser only. */
  previewMode?: boolean;
  returnHref?: string;
};

function exerciseTheory(block: LessonBlock) {
  const firstExercise = block.exercises[0];
  if (!firstExercise) return null;
  const context = asObject(asObject(firstExercise.content).authoringContext);
  if (context.visible === false || typeof context.text !== "string" || !context.text.trim()) return null;
  return context.text.trim();
}

export function LessonPlayer({
  lessonId, courseSlug, moduleTitle, title, estimatedDuration, objectives, blocks, lessons,
  currentSlug, canSaveProgress, vocabulary = [], warmUpSessionId, warmUpRequired = false,
  autoUnlockNextLesson = true, isFirstCourseLesson = false, previewMode = false, returnHref,
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
  const [theoryCollapsed, setTheoryCollapsed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [stepVerified, setStepVerified] = useState(false);
  const [finished, setFinished] = useState(false);
  const hasGuestPreviewRef = useRef(false);
  const previewCompleteReported = useRef(false);
  const learningSessionId = useRef<string | null>(null);
  const interactionCount = useRef(0);

  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const objectiveItems = asStringArray(objectives);
  const activeIndex = Math.max(0, blocks.findIndex((block) => block.id === currentBlockId));
  const activeBlock = blocks[activeIndex] ?? null;
  const activeTheory = activeBlock?.type === "EXERCISE" ? exerciseTheory(activeBlock) : null;
  const isInteractiveStep = Boolean(activeBlock?.type === "EXERCISE" && activeBlock.exercises.length);
  const canAdvance = Boolean(activeBlock && (!isInteractiveStep || stepVerified || completedBlocks.includes(activeBlock.id)));
  const progressPercent = useMemo(() => blocks.length ? Math.round((completedBlocks.length / blocks.length) * 100) : 0, [blocks.length, completedBlocks.length]);
  const guestPreviewKey = `krin:lesson-preview:${lessonId}`;
  const destination = returnHref ?? `/courses/${courseSlug}`;

  useEffect(() => {
    if (previewMode) return;
    if (canSaveProgress) {
      if (isFirstCourseLesson) reportFunnelEvent("FIRST_LESSON_START");
      return;
    }
    reportFunnelEvent("PREVIEW_LESSON_START");
  }, [canSaveProgress, isFirstCourseLesson, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress) return;
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
      }).then((response) => { if (response.ok) window.localStorage.removeItem(guestPreviewKey); }).catch(() => undefined);
    } catch {
      window.localStorage.removeItem(guestPreviewKey);
    }
  }, [blocks, canSaveProgress, guestPreviewKey, lessonId, previewMode]);

  useEffect(() => {
    if (previewMode || canSaveProgress) return;
    try {
      window.localStorage.setItem(guestPreviewKey, JSON.stringify({ completedBlocks, currentBlockId, activeSeconds: elapsedSeconds }));
    } catch {
      // Storage is optional; an unauthenticated learner can still use the lesson.
    }
  }, [canSaveProgress, completedBlocks, currentBlockId, elapsedSeconds, guestPreviewKey, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress) return;
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
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [blocks, canSaveProgress, lessonId, previewMode]);

  useEffect(() => {
    if (previewMode || !canSaveProgress) return;
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
    const timer = window.setInterval(heartbeat, 30_000);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", noteInteraction);
      window.removeEventListener("keydown", noteInteraction);
      if (learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined);
    };
  }, [canSaveProgress, lessonId, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [previewMode]);

  useEffect(() => {
    setTheoryCollapsed(false);
    setHintOpen(false);
    setStepVerified(Boolean(activeBlock && (!isInteractiveStep || completedBlocks.includes(activeBlock.id))));
  }, [activeBlock, completedBlocks, isInteractiveStep]);

  async function persistProgress(complete = false, snapshot?: { completed: string[]; current: string | null }) {
    if (previewMode || !canSaveProgress) return null;
    const savedCompleted = snapshot?.completed ?? completedBlocks;
    const savedCurrent = snapshot?.current ?? currentBlockId;
    setSaveError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedBlockIds: savedCompleted, currentBlockId: savedCurrent, activeSeconds: 0, complete }),
    });
    const payload = await response.json() as { data?: StoredProgress; error?: string };
    if (!response.ok || !payload.data) {
      setSaveError(payload.error ?? "Unable to save your progress.");
      return null;
    }
    setStoredProgress(payload.data);
    if (payload.data.motivationReward?.awarded) {
      const reward = payload.data.motivationReward;
      setRewardEvents([{ type: reward.levelUp ? "LEVEL_UP" : "XP_GAINED", title: reward.levelUp ? "Level up!" : "Lesson reward", detail: `+${reward.experience} XP${reward.coins ? ` · +${reward.coins} coins` : ""}` }]);
    }
    if (complete && learningSessionId.current) void fetch(`/api/learning/sessions/${learningSessionId.current}/complete`, { method: "POST" }).catch(() => undefined);
    if (complete && payload.data.status === "COMPLETED" && isFirstCourseLesson) reportFunnelEvent("FIRST_LESSON_COMPLETE");
    return payload.data;
  }

  useEffect(() => {
    if (previewMode || !canSaveProgress || elapsedSeconds === 0 || elapsedSeconds % 30 !== 0) return;
    void persistProgress();
  // Saving happens at the clock boundary, not every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, canSaveProgress, previewMode]);

  async function advanceStep() {
    if (!activeBlock || !canAdvance) return;
    const nextCompleted = completedBlocks.includes(activeBlock.id) ? completedBlocks : [...completedBlocks, activeBlock.id];
    const nextBlock = blocks[activeIndex + 1] ?? null;
    setCompletedBlocks(nextCompleted);
    if (nextBlock) {
      setCurrentBlockId(nextBlock.id);
      await persistProgress(false, { completed: nextCompleted, current: nextBlock.id });
      return;
    }

    const saved = await persistProgress(true, { completed: nextCompleted, current: activeBlock.id });
    if (canSaveProgress && !saved) return;
    if (!previewMode && !canSaveProgress && !previewCompleteReported.current) {
      previewCompleteReported.current = true;
      reportFunnelEvent("PREVIEW_LESSON_COMPLETE");
    }
    if (saved?.status === "COMPLETED" && autoUnlockNextLesson && nextLesson) {
      router.push(`/courses/${courseSlug}/lessons/${nextLesson.slug}`);
      return;
    }
    setFinished(true);
  }

  async function leaveLesson() {
    const saved = await persistProgress(false);
    if (canSaveProgress && !previewMode && !saved) return;
    router.push(destination);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      void leaveLesson();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // `leaveLesson` intentionally reads the latest saved state from this render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBlockId, completedBlocks, canSaveProgress, previewMode]);

  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const showWarmUp = !previewMode && Boolean(warmUpSessionId && !warmUpDone);

  return (
    <main className={styles.player}>
      <RewardNotification events={rewardEvents} />
      <div className={styles.frame}>
        <header className={styles.header} aria-label="Lesson controls">
          <button type="button" className={styles.closeLink} onClick={() => void leaveLesson()} aria-label="Save progress and close lesson">Close</button>
          <div className={styles.progress} aria-label={`Lesson progress: ${progressPercent}%`}>
            <div className={styles.progressMeta}><span>{progressPercent}% complete</span><span>{previewMode ? "Preview" : `Active ${formattedTime}`}</span></div>
            <div className={styles.progressTrack}><div className={styles.progressValue} style={{ width: `${progressPercent}%` }} /></div>
          </div>
          <span className={styles.stepCounter}>Step {blocks.length ? activeIndex + 1 : 0} of {blocks.length}</span>
        </header>

        <section className={styles.lessonContext} aria-labelledby="lesson-title">
          <h1 id="lesson-title">{title}</h1>
          <p>{moduleTitle} · {estimatedDuration ? `${estimatedDuration} min` : "Self-paced"}{storedProgress ? ` · Score ${storedProgress.score}` : ""}</p>
        </section>

        {showWarmUp ? (
          <section className={styles.taskCard}>
            <p className={styles.taskType}>Before the lesson</p>
            <h2>Quick warm-up</h2>
            <p className="mt-2 text-sm text-slate-600">Review a few words selected from your recent learning progress.</p>
            <div className="mt-5"><VocabularyTrainingPlayer sessionId={warmUpSessionId!} compact onCompleted={() => setWarmUpDone(true)} /></div>
            {!warmUpRequired ? <button type="button" disabled={skippingWarmUp} onClick={() => void skipWarmUp()} className={styles.showTheory}>{skippingWarmUp ? "Skipping…" : "Skip warm-up"}</button> : null}
          </section>
        ) : finished ? (
          <section className={styles.completion} aria-live="polite">
            <p className={styles.taskType}>Lesson complete</p>
            <h2>Great work — your progress is saved.</h2>
            <p>{previewMode ? "This was a protected preview. Return to the editor to continue creating the lesson." : "Continue with your course whenever you are ready."}</p>
            <button type="button" className={styles.finishButton} onClick={() => router.push(destination)}>{previewMode ? "Back to editor" : "Back to course"}</button>
          </section>
        ) : !activeBlock ? (
          <section className={styles.empty}><h2>No lesson steps yet</h2><p>Add content blocks in the lesson editor to build the learner flow.</p></section>
        ) : (
          <section className={styles.workspace} aria-label="Current lesson step">
            {!previewMode && vocabulary.length > 0 ? <LessonVocabularyPanel lessonId={lessonId} words={vocabulary} /> : null}
            {activeTheory ? (
              <section className={styles.theory}>
                <button type="button" className={styles.theoryToggle} onClick={() => setTheoryCollapsed((value) => !value)} aria-expanded={!theoryCollapsed}>
                  <span><span className={styles.theoryEyebrow}>Theory for this step</span><span className={styles.theoryTitle}>Use this explanation while you practise</span></span>
                  <span>{theoryCollapsed ? "Show theory" : "Hide theory"}</span>
                </button>
                <div className={`${styles.theoryPanel} ${theoryCollapsed ? styles.theoryPanelCollapsed : ""}`}><div className={styles.theoryInner}><p className={styles.theoryText}>{activeTheory}</p></div></div>
              </section>
            ) : null}

            <article className={styles.taskCard}>
              <div className={styles.taskTopline}>
                <span className={styles.taskType}>{activeBlock.type.replace(/_/g, " ")}</span>
                {activeBlock.isRequired ? <span className={styles.required}>Required step</span> : null}
              </div>
              <div className={styles.focusContent} key={activeBlock.id}>
                <LessonBlockRenderer
                  block={activeBlock}
                  completed={completedBlocks.includes(activeBlock.id)}
                  onToggleComplete={() => undefined}
                  canSaveProgress={false}
                  previewMode={previewMode}
                  hideExerciseTheoryText={Boolean(activeTheory)}
                  onAttemptResolved={({ isCorrect }) => setStepVerified(isCorrect)}
                />
              </div>
            </article>

            {activeBlock.exercises[0]?.hint && hintOpen ? <p className={styles.hint} role="status">{activeBlock.exercises[0].hint}</p> : null}
            <footer className={styles.footer}>
              <p className={styles.footerNote}>{isInteractiveStep && !stepVerified ? "Check your answer to unlock the next step." : objectiveItems[0] ?? "Take one focused step at a time."}</p>
              <div className={styles.footerActions}>
                {activeBlock.exercises[0]?.hint ? <button type="button" className={styles.hintButton} onClick={() => setHintOpen((value) => !value)}>{hintOpen ? "Hide hint" : "Hint"}</button> : null}
                <button type="button" className={activeIndex === blocks.length - 1 ? styles.finishButton : styles.nextButton} disabled={!canAdvance} onClick={() => void advanceStep()}>{activeIndex === blocks.length - 1 ? "Finish lesson" : "Next step"}</button>
              </div>
            </footer>
          </section>
        )}

        {saveError ? <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p> : null}
        {!previewMode && !canSaveProgress ? <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">You are trying a real lesson. Sign in after the preview to save this step and continue from the same place.</p> : null}
      </div>
    </main>
  );
}
