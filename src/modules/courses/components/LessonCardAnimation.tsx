"use client";

import { useRef } from "react";
import styles from "./LessonCardAnimation.module.css";

type LessonCardAnimationProps = {
  lessonOrder: number;
};

// Small Pixabay previews are intentionally loaded only when a learner hovers
// the preview. This keeps a programme with many lessons fast to open.
const PIXABAY_ANIMATIONS = [
  {
    poster: "https://cdn.pixabay.com/video/2021/12/30/102981-661469758_tiny.jpg",
    video: "https://cdn.pixabay.com/video/2021/12/30/102981-661469758_large.mp4",
  },
  {
    poster: "https://cdn.pixabay.com/video/2023/05/21/163987-828840013_tiny.jpg",
    video: "https://cdn.pixabay.com/video/2023/05/21/163987-828840013_large.mp4",
  },
] as const;

export function LessonCardAnimation({ lessonOrder }: LessonCardAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animation = PIXABAY_ANIMATIONS[Math.abs(lessonOrder - 1) % PIXABAY_ANIMATIONS.length];

  const playPreview = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void videoRef.current?.play().catch(() => undefined);
  };

  const stopPreview = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <span
      aria-hidden="true"
      className={styles.preview}
      onPointerEnter={playPreview}
      onPointerLeave={stopPreview}
    >
      <video
        ref={videoRef}
        className={styles.video}
        loop
        muted
        playsInline
        poster={animation.poster}
        preload="none"
      >
        <source src={animation.video} type="video/mp4" />
      </video>
      <span className={styles.playMark}>▶</span>
    </span>
  );
}
