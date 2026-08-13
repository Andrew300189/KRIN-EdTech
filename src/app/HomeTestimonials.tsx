"use client";

import { useEffect, useRef, useState } from "react";
import s from "./HomeTestimonials.module.css";

const TESTIMONIALS = [
  {
    name: "Olena M.", flag: "🇺🇦", before: "A2", after: "B2", rating: 5,
    text: "I went from struggling to form sentences to presenting in English at work. The structured levels and placement test made all the difference.",
  },
  {
    name: "James R.", flag: "🇬🇧", before: "B1", after: "C1", rating: 5,
    text: "The gamified approach kept me engaged every day. I passed my IELTS with a 7.5 after just 6 months on this platform.",
  },
  {
    name: "Ana S.", flag: "🇧🇷", before: "A1", after: "B1", rating: 5,
    text: "As a complete beginner I was intimidated. The A1 course was perfectly paced and the interactive exercises made learning feel like a game.",
  },
  {
    name: "Dmitri P.", flag: "🇷🇺", before: "B2", after: "C1", rating: 5,
    text: "The professional English track helped me land a job at an international company. My manager still compliments my business writing.",
  },
  {
    name: "Fatima Z.", flag: "🇲🇦", before: "A2", after: "B2", rating: 5,
    text: "Two years ago I could not follow English videos. Now I deliver presentations to international clients. KRIN EdTech changed my career.",
  },
];

export function HomeTestimonials() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (next: number) =>
    setActive(((next % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = setTimeout(() => go(active + 1), 5500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const t = TESTIMONIALS[active];

  return (
    <section className={s.section}>
      <div className={s.shell}>
        {/* Sticky header column */}
        <div className={s.header}>
          <p className={s.eyebrow}>Student stories</p>
          <h2 className={s.heading}>Real results from real learners.</h2>
          <p className={s.subtext}>
            Join thousands of students who have levelled up their English on
            KRIN EdTech and changed their careers.
          </p>
          <span className={s.totalCount}>
            ⭐ {TESTIMONIALS.length}+ featured reviews
          </span>
        </div>

        {/* Carousel column */}
        <div className={s.carousel}>
          <div className={s.card} key={active}>
            <div className={s.stars} aria-label={`${t.rating} out of 5 stars`}>
              {"★".repeat(t.rating)}
            </div>
            <p className={s.quote}>&ldquo;{t.text}&rdquo;</p>
            <div className={s.author}>
              <div className={s.avatar} aria-hidden="true">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={s.authorInfo}>
                <span className={s.authorName}>{t.flag} {t.name}</span>
                <span className={s.levelJourney}>{t.before} → {t.after}</span>
              </div>
            </div>
          </div>

          <div className={s.controls}>
            <div className={s.dots} role="tablist" aria-label="Testimonials navigation">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`${s.dot} ${i === active ? s.dotActive : ""}`}
                  onClick={() => go(i)}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <div className={s.navGroup}>
              <button type="button" className={s.navBtn} onClick={() => go(active - 1)} aria-label="Previous testimonial">←</button>
              <button type="button" className={s.navBtn} onClick={() => go(active + 1)} aria-label="Next testimonial">→</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
