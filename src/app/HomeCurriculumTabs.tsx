"use client";

import Link from "next/link";
import { useState } from "react";
import s from "./HomeCurriculumTabs.module.css";

const CEFR = ["A1", "A2", "B1", "B2", "C1"] as const;
type Cefr = (typeof CEFR)[number];

const CONTENT: Record<Cefr, { emoji: string; tagline: string; skills: string[] }> = {
  A1: {
    emoji: "🌱",
    tagline: "Build your first English foundation with confidence.",
    skills: ["Greet people and introduce yourself", "Count, describe colours and tell the time", "Talk about family, routines and everyday objects", "Ask and answer simple questions about yourself"],
  },
  A2: {
    emoji: "🚀",
    tagline: "Handle everyday situations wherever you travel.",
    skills: ["Order food, shop and navigate transport", "Describe past events and recent experiences", "Talk about plans and the near future", "Write short messages, notes and emails"],
  },
  B1: {
    emoji: "🎯",
    tagline: "Navigate real conversations with growing confidence.",
    skills: ["Express opinions, preferences and feelings clearly", "Follow news broadcasts and authentic texts", "Deal with travel problems and unexpected situations", "Write straightforward, well-connected texts"],
  },
  B2: {
    emoji: "⚡",
    tagline: "Communicate fluently and spontaneously on most topics.",
    skills: ["Discuss complex topics in clear, detailed language", "Understand implicit meaning and tone", "Produce clear, formal and informal documents", "Argue, persuade and debate effectively"],
  },
  C1: {
    emoji: "🏆",
    tagline: "Use English with precision at near-native level.",
    skills: ["Express yourself spontaneously and fluently", "Read and write dense, complex academic texts", "Achieve professional and academic language goals", "Understand virtually any non-specialist English content"],
  },
};

interface Props {
  levels: Array<{ code: string; title: string; _count: { courses: number } }>;
}

export function HomeCurriculumTabs({ levels }: Props) {
  const [active, setActive] = useState<Cefr>("B1");
  const data = CONTENT[active];
  const levelInfo = levels.find((l) => l.code === active);

  const counts = Object.fromEntries(
    CEFR.map((lvl) => [lvl, levels.find((l) => l.code === lvl)?._count.courses ?? 0]),
  ) as Record<Cefr, number>;

  return (
    <section className={s.section} data-ao="fade-up" data-ao-delay="1">
      <div className={s.shell}>
        <div className={s.header} data-ao="fade-up" data-ao-delay="2">
          <h2 className={s.heading}>Explore what you will achieve at each level.</h2>
          <p className={s.sub}>
            Click a CEFR level to preview the skills and outcomes you will gain
            from published courses.
          </p>
        </div>

        <div className={s.tabs} role="tablist" aria-label="CEFR curriculum levels">
          {CEFR.map((lvl) => (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={lvl === active}
              className={`${s.tab} ${lvl === active ? s.tabActive : ""}`}
              onClick={() => setActive(lvl)}
            >
              {lvl}
              {counts[lvl] > 0 && (
                <span className={s.tabCount}>{counts[lvl]}</span>
              )}
            </button>
          ))}
        </div>

        <div className={s.panel} key={active} role="tabpanel" aria-label={`${active} level overview`} data-ao="fade-up" data-ao-delay="3">
          <div>
            <span className={s.levelEmoji}>{data.emoji}</span>
            <span className={s.levelBadge}>
              {active} · {levelInfo?.title ?? "Level"}
            </span>
            <p className={s.tagline}>{data.tagline}</p>
            <ul className={s.skillList}>
              {data.skills.map((skill) => (
                <li key={skill} className={s.skillItem}>
                  <span className={s.skillCheck}>✓</span>
                  {skill}
                </li>
              ))}
            </ul>
            {levelInfo && levelInfo._count.courses > 0 && (
              <Link href={`/levels/${active.toLowerCase()}`} className={s.cta}>
                Explore {levelInfo._count.courses}{" "}
                {active} {levelInfo._count.courses === 1 ? "course" : "courses"} →
              </Link>
            )}
          </div>

          <div className={s.previewCard}>
            <p className={s.previewLabel}>Sample learning path</p>
            {["Placement & orientation", "Core grammar foundations", "Vocabulary & reading skills", "Speaking & listening practice", "Final assessment & certificate"].map((step, i) => (
              <div key={i} className={s.pathItem}>
                <span className={s.pathNum}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
