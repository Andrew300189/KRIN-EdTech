"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicLearningStatistics } from "@/modules/analytics/types/platform-statistics.types";
import { buildPublicStatisticCards } from "@/modules/analytics/utils/public-statistic-cards";
import s from "./HomeCounterBanner.module.css";

function AnimatedNumber({
  target,
  format,
  trigger,
  delayMs = 0,
}: {
  target: number;
  format: (value: number) => string;
  trigger: boolean;
  delayMs?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setValue(0);
      return;
    }

    const timer = window.setTimeout(() => {
      const duration = 420;
      const start = performance.now();
      let rafId = 0;

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);

        if (progress < 1) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        setValue(target);
      };

      rafId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(rafId);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, target, trigger]);

  return <>{format(value)}</>;
}

type StatisticsResponse = { data?: PublicLearningStatistics };

function isStatisticsResponse(
  payload: StatisticsResponse | null,
): payload is { data: PublicLearningStatistics } {
  return Boolean(
    payload?.data &&
      Number.isFinite(payload.data.registeredLearners) &&
      Number.isFinite(payload.data.masteredWords) &&
      Number.isFinite(payload.data.completedCourses) &&
      Number.isFinite(payload.data.completedLessons),
  );
}

export function HomeCounterBanner({
  initialStatistics,
}: {
  initialStatistics: PublicLearningStatistics;
}) {
  const ref = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [statistics, setStatistics] = useState(initialStatistics);

  const refreshStatistics = useCallback(async () => {
    try {
      const response = await fetch("/api/platform/statistics", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as StatisticsResponse | null;
      if (response.ok && isStatisticsResponse(payload)) {
        setStatistics(payload.data);
      }
    } catch {
      // Statistics are supplementary; a transient network error must not
      // make the public home page unavailable.
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTriggered(true);
          return;
        }

        setTriggered(false);
        setIsVisible(false);
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // The server-rendered value is already fresh for this page visit. Waiting
    // for the regular refresh avoids immediately repeating four aggregate
    // database counts as soon as this decorative banner enters the viewport.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshStatistics();
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [isVisible, refreshStatistics]);

  const statisticsCards = buildPublicStatisticCards(statistics);

  return (
    <section ref={ref} className={s.banner} aria-label="Platform statistics">
      <div className={s.inner}>
        {statisticsCards.map((stat, index) => (
          <div
            key={stat.label}
            className={`${s.item} ${isVisible ? s.visible : s.hidden}`}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <span className={s.icon} aria-hidden="true">
              {stat.icon}
            </span>
            <strong className={s.value}>
              <AnimatedNumber
                target={stat.value}
                format={(value) => Math.round(value).toLocaleString("en-US")}
                trigger={triggered}
                delayMs={index * 150 + 220}
              />
            </strong>
            <span className={s.label}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
