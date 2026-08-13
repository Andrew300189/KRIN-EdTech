"use client";

import { useEffect, useRef, useState } from "react";
import s from "./HomeCounterBanner.module.css";

// TODO: replace placeholder values with real DB-derived metrics
const STATS = [
  { icon: "👥", target: 0, label: "Active Students",        format: (_n: number) => "—" },
  { icon: "📖", target: 0, label: "English Words Learned",  format: (_n: number) => "—" },
  { icon: "🎓", target: 0, label: "Completed Courses",      format: (_n: number) => "—" },
  { icon: "📈", target: 0, label: "Avg. Score Improvement", format: (_n: number) => "—" },
];

function AnimatedNumber({ target, format, trigger }: {
  target: number;
  format: (n: number) => string;
  trigger: boolean;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    const duration = 1800;
    const start = performance.now();

    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else setVal(target);
    }

    requestAnimationFrame(tick);
  }, [trigger, target]);

  return <>{format(val)}</>;
}

export function HomeCounterBanner() {
  const ref = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={s.banner} aria-label="Platform statistics">
      <div className={s.inner}>
        {STATS.map((stat) => (
          <div key={stat.label} className={s.item}>
            <span className={s.icon} aria-hidden="true">{stat.icon}</span>
            <strong className={s.value}>
              <AnimatedNumber target={stat.target} format={stat.format} trigger={triggered} />
            </strong>
            <span className={s.label}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
