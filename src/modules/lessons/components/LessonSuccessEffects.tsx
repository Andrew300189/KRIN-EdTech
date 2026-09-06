"use client";

import { type CSSProperties, useEffect, useState } from "react";
import styles from "./LessonSuccessEffects.module.css";
import { playLessonSuccessSound } from "@/modules/lessons/utils/success-sound";

export type LessonSuccessEffect = {
  id: number;
  burst: boolean;
};

const confettiColours = ["#5b4cf0", "#1ea9ff", "#35c98d", "#ffc83d", "#ff6a88", "#9a6cff"];
const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  colour: confettiColours[index % confettiColours.length],
  drift: ((index * 37) % 180) - 90,
  delay: (index % 6) * 16,
  size: 6 + ((index * 11) % 7),
}));

export function LessonSuccessEffects({ effect }: { effect: LessonSuccessEffect | null }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!effect) return;
    playLessonSuccessSound();
    if (!effect.burst || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShowConfetti(false);
      return;
    }
    setShowConfetti(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 1_000);
    return () => window.clearTimeout(timer);
  }, [effect]);

  if (!showConfetti) return null;

  return (
    <div className={styles.stage} aria-hidden="true">
      {confettiPieces.map((piece) => (
        <span
          key={piece.id}
          className={styles.piece}
          style={{
            "--confetti-colour": piece.colour,
            "--confetti-drift": `${piece.drift}vw`,
            "--confetti-delay": `${piece.delay}ms`,
            "--confetti-size": `${piece.size}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
