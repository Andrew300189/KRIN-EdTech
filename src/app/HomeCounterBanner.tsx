"use client";

import { useEffect, useRef, useState } from "react";
import s from "./HomeCounterBanner.module.css";

const STATS = [
  { icon: "👥", target: 1, label: "Active Students", format: (n: number) => Math.round(n).toString() },
  { icon: "📖", target: 0, label: "English Words Learned", format: (n: number) => Math.round(n).toString() },
  { icon: "🎓", target: 0, label: "Completed Courses", format: (n: number) => Math.round(n).toString() },
  { icon: "📈", target: 0, label: "Avg. Score Improvement", format: (n: number) => Math.round(n).toString() },
];

function AnimatedNumber({ target, format, trigger, delayMs = 0 }: {
  target: number;
  format: (n: number) => string;
  trigger: boolean;
  delayMs?: number;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setVal(0);
      return;
    }

    const timer = window.setTimeout(() => {
      const duration = 420;
      const start = performance.now();
      let rafId = 0;

      function tick(now: number) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(target * eased);

        if (p < 1) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        setVal(target);
      }

      rafId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(rafId);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [trigger, target, delayMs]);

  return <>{format(val)}</>;
}

export function HomeCounterBanner() {
  const ref = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={s.banner} aria-label="Platform statistics">
      <div className={s.inner}>
        {STATS.map((stat, index) => (
          <div
            key={`${stat.label}-${index}`}
            className={`${s.item} ${isVisible ? s.visible : s.hidden}`}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <span className={s.icon} aria-hidden="true">{stat.icon}</span>
            <strong className={s.value}>
              <AnimatedNumber
                target={stat.target}
                format={stat.format}
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
