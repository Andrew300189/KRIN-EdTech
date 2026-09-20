"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./LessonRewardWheel.module.css";

export type LessonXpMultiplierWheelResult = {
  available: boolean;
  spun: boolean;
  alreadySpun: boolean;
  baseExperience: number;
  multiplierStep: number | null;
  multiplier: number | null;
  bonusExperience: number;
  totalExperience: number;
};

const MULTIPLIER_STEPS = Array.from({ length: 21 }, (_, index) => index + 10);
const SEGMENT_DEGREES = 360 / MULTIPLIER_STEPS.length;

const copy = {
  en: {
    title: "XP multiplier wheel", range: "Every value from ×1.0 to ×3.0 is equally likely", ready: "Your XP counter is ready — spin for the final total.",
    spin: "Spin for XP", preparing: "Preparing…", spinning: "Spinning…", complete: "Multiplier applied", restored: "Multiplier already applied",
    result: (multiplier: number, total: number) => `×${multiplier.toFixed(1)} · ${total} XP total`,
    error: "Unable to spin the XP multiplier wheel.",
  },
  ru: {
    title: "Колесо множителя XP", range: "Каждое значение от ×1.0 до ×3.0 выпадает с одинаковой вероятностью", ready: "XP посчитаны — крутите колесо, чтобы узнать итог.",
    spin: "Крутить на XP", preparing: "Готовим…", spinning: "Крутим…", complete: "Множитель применён", restored: "Множитель уже применён",
    result: (multiplier: number, total: number) => `×${multiplier.toFixed(1)} · всего ${total} XP`,
    error: "Не удалось запустить колесо множителя XP.",
  },
  uk: {
    title: "Колесо множника XP", range: "Кожне значення від ×1.0 до ×3.0 має однакову ймовірність", ready: "XP пораховано — крутіть колесо, щоб дізнатися підсумок.",
    spin: "Крутити на XP", preparing: "Готуємо…", spinning: "Крутимо…", complete: "Множник застосовано", restored: "Множник уже застосовано",
    result: (multiplier: number, total: number) => `×${multiplier.toFixed(1)} · усього ${total} XP`,
    error: "Не вдалося запустити колесо множника XP.",
  },
} as const;

function landingTurn(multiplierStep: number, currentTurn: number) {
  const index = MULTIPLIER_STEPS.indexOf(multiplierStep);
  const segmentCentre = Math.max(0, index) * SEGMENT_DEGREES + SEGMENT_DEGREES / 2;
  // CSS conic gradients begin at 12 o'clock. Bring the selected segment to
  // the fixed pointer after a visibly satisfying number of full rotations.
  const landingAngle = (360 - segmentCentre) % 360;
  const currentAngle = ((currentTurn % 360) + 360) % 360;
  const adjustment = (landingAngle - currentAngle + 360) % 360;
  return currentTurn + (6 + Math.floor(Math.random() * 3)) * 360 + adjustment;
}

function isMultiplierResult(value: unknown): value is LessonXpMultiplierWheelResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<LessonXpMultiplierWheelResult>;
  return typeof result.available === "boolean"
    && typeof result.spun === "boolean"
    && typeof result.alreadySpun === "boolean"
    && typeof result.baseExperience === "number"
    && typeof result.totalExperience === "number";
}

type Props = {
  lessonId: string;
  /** The immutable XP total shown in the initial counter. */
  baseExperience: number;
  /** The card is deliberately withheld until that first counter has settled. */
  ready: boolean;
  onCollected?: () => void;
  onMultiplierApplied?: (result: LessonXpMultiplierWheelResult) => void;
};

/**
 * The wheel is presentation only. Its exact result is selected and written
 * once by the protected API before this component animates to that segment.
 */
export function LessonRewardWheel({ lessonId, baseExperience, ready, onCollected, onMultiplierApplied }: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turn, setTurn] = useState(0);
  const [reward, setReward] = useState<LessonXpMultiplierWheelResult | null>(null);
  // State updates are asynchronous. Keep an imperative latch as well so a
  // double tap, held Enter/Space key, or a stale event from a touch device can
  // never submit a second spin before React has redrawn the disabled button.
  const spinRequestedRef = useRef(false);
  // A GET and a POST can resolve in either order. The first confirmed outcome
  // is the only one allowed to update the parent completion screen.
  const resultAppliedRef = useRef(false);
  const onCollectedRef = useRef(onCollected);
  const onMultiplierAppliedRef = useRef(onMultiplierApplied);
  const resolvedReward = reward ?? {
    available: baseExperience > 0,
    spun: false,
    alreadySpun: false,
    baseExperience,
    multiplierStep: null,
    multiplier: null,
    bonusExperience: 0,
    totalExperience: baseExperience,
  };

  useEffect(() => { onCollectedRef.current = onCollected; }, [onCollected]);
  useEffect(() => { onMultiplierAppliedRef.current = onMultiplierApplied; }, [onMultiplierApplied]);

  function applyResolvedReward(result: LessonXpMultiplierWheelResult) {
    if (resultAppliedRef.current) return;
    resultAppliedRef.current = true;
    onMultiplierAppliedRef.current?.(result);
    onCollectedRef.current?.();
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/wheel`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { data?: unknown } | null;
        const result = payload?.data;
        if (!response.ok || !isMultiplierResult(result)) return;
        setReward(result);
        if (result.alreadySpun) {
          if (result.multiplierStep !== null) setTurn(landingTurn(result.multiplierStep, 0));
          applyResolvedReward(result);
        }
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [lessonId]);

  async function spin() {
    if (spinRequestedRef.current || spinning || loading || reward?.alreadySpun || reward?.spun) return;
    spinRequestedRef.current = true;
    setSpinning(true);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/wheel`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: unknown; error?: string } | null;
      const result = payload?.data;
      if (!response.ok || !isMultiplierResult(result)) throw new Error(payload?.error ?? text.error);
      if (!result.available || result.multiplierStep === null) {
        setReward(result);
        applyResolvedReward(result);
        return;
      }

      setTurn((current) => landingTurn(result.multiplierStep!, current));
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion) await new Promise((resolve) => window.setTimeout(resolve, 1_450));
      setReward(result);
      applyResolvedReward(result);
      if (result.spun) {
        notifyMotivationUpdated();
        toast.success(text.result(result.multiplier ?? 1, result.totalExperience));
      }
    } catch (error) {
      // A failed request did not produce a server reward, so explicitly allow
      // the learner to retry. Successful requests keep the latch forever.
      spinRequestedRef.current = false;
      toast.error(error instanceof Error ? error.message : text.error);
    } finally {
      setSpinning(false);
    }
  }

  if (!ready || !resolvedReward.available) return null;
  const hasResult = resolvedReward.spun || resolvedReward.alreadySpun;
  const buttonText = loading ? text.preparing : spinning ? text.spinning : hasResult ? text.complete : text.spin;
  const centreText = spinning ? "×?" : hasResult && resolvedReward.multiplier !== null ? `×${resolvedReward.multiplier.toFixed(1)}` : "×";

  return <section className={styles.card} aria-live="polite" aria-label={text.title}>
    <div className={styles.wheelWrap}>
      <span className={styles.pointer} aria-hidden="true">◆</span>
      <span className={styles.wheel} style={{ transform: `rotate(${turn}deg)` }} aria-hidden="true">
        {MULTIPLIER_STEPS.map((step, index) => <span key={step} className={styles.wheelTick} style={{ transform: `rotate(${index * SEGMENT_DEGREES + SEGMENT_DEGREES / 2}deg)` }} />)}
      </span>
      <span className={styles.wheelCentre} aria-hidden="true">{centreText}</span>
    </div>
    <div className={styles.copy}>
      <p>{text.title}</p>
      <strong>{hasResult && resolvedReward.multiplier !== null ? text.result(resolvedReward.multiplier, resolvedReward.totalExperience) : text.ready}</strong>
      <small>{hasResult && resolvedReward.alreadySpun ? text.restored : text.range}</small>
    </div>
    <button type="button" onClick={() => void spin()} disabled={loading || spinning || hasResult}>
      {buttonText}
    </button>
  </section>;
}
