"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MOTIVATION_UPDATED_EVENT } from "../motivation-events";
import styles from "./ExperienceStatus.module.css";

type MotivationOverview = {
  level: {
    level: number;
    lifetimeExperience: number;
  };
};

export function ExperienceStatus({ className = "" }: { className?: string }) {
  const [overview, setOverview] = useState<MotivationOverview | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: MotivationOverview } | null;
      if (response.ok && payload?.data) setOverview(payload.data);
    } catch {
      // XP is supplementary UI. The learning flow is usable if it cannot load.
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, load);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, load);
  }, [load]);

  if (!overview) return null;

  return (
    <Link
      href="/student/progress"
      className={`${styles.status} ${className}`}
      aria-label={`Level ${overview.level.level}, ${overview.level.lifetimeExperience} XP. Open progress.`}
      title="Open learning progress"
    >
      <span>Lv. {overview.level.level}</span>
      <strong>{overview.level.lifetimeExperience} XP</strong>
    </Link>
  );
}
