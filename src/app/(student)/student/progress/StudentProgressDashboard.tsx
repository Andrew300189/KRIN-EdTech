"use client";

import { useMemo, useState } from "react";
import type { LearningCompetency, SkillProgress, StudentProgressOverview } from "@/modules/courses/services/student-progress.service";
import styles from "./StudentProgress.module.css";

type StudentProgressDashboardProps = {
  overview: StudentProgressOverview;
};

const radarCoordinates: Record<LearningCompetency, { x: number; y: number; labelX: number; labelY: number }> = {
  READING: { x: 50, y: 13, labelX: 50, labelY: 7 },
  GRAMMAR: { x: 87, y: 50, labelX: 96, labelY: 51 },
  USE_OF_ENGLISH: { x: 50, y: 87, labelX: 50, labelY: 98 },
  VOCABULARY: { x: 13, y: 50, labelX: 4, labelY: 51 },
};

function pointForSkill(skill: SkillProgress) {
  const coordinate = radarCoordinates[skill.key];
  const scale = skill.progress / 100;
  return {
    x: 50 + (coordinate.x - 50) * scale,
    y: 50 + (coordinate.y - 50) * scale,
  };
}

function formatExistingMetricValue(value: number | null, suffix = "%") {
  return value === null ? "—" : `${value}${suffix}`;
}

function metricValue(value: number | null, suffix = "%") {
  return value === null ? "—" : formatExistingMetricValue(value, suffix);
}

export function StudentProgressDashboard({ overview }: StudentProgressDashboardProps) {
  const [selectedSkillKey, setSelectedSkillKey] = useState<LearningCompetency>("READING");
  const selectedSkill = overview.skills.find((skill) => skill.key === selectedSkillKey) ?? overview.skills[0];
  const radarPoints = useMemo(
    () => overview.skills.map(pointForSkill).map((point) => `${point.x},${point.y}`).join(" "),
    [overview.skills],
  );
  const maxWeeklyMinutes = Math.max(1, ...overview.weeklyActivity.map((item) => item.minutes));

  return <section className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Learning analytics</p><h2>My progress</h2><p>See the work you have saved and which competency is ready for more practice.</p></div>
    </header>

    <section className={styles.metricGrid} aria-label="Progress overview">
      <article><span>Lessons tracked</span><strong>{overview.totalLessons}</strong><p>{overview.completedLessons} completed</p></article>
      <article><span>Study time</span><strong>{overview.activeMinutes}</strong><p>minutes recorded</p></article>
      <article><span>Answer accuracy</span><strong>{metricValue(overview.accuracy)}</strong><p>{overview.accuracy === null ? "No checked answers yet" : "Across saved lessons"}</p></article>
      <article><span>Competencies practised</span><strong>{overview.skills.filter((skill) => skill.lessonCount > 0).length}/4</strong><p>Reading, Grammar, Use of English, Vocabulary</p></article>
    </section>

    <section className={styles.skillSection} aria-labelledby="skill-progress-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Four core competencies</p><h3 id="skill-progress-heading">Competency development</h3><p>Each value is the average saved completion for lessons of that exact competency.</p></div><span>Interactive chart</span></div>
      <div className={styles.skillLayout}>
        <div className={styles.radarWrap}>
          <svg viewBox="0 0 100 100" className={styles.radar} role="img" aria-label="Radar chart showing learning progress in Reading, Grammar, Use of English and Vocabulary">
            {[16, 25, 34].map((radius) => <polygon key={radius} points={`50,${50 - radius} ${50 + radius},50 50,${50 + radius} ${50 - radius},50`} className={styles.radarGuide} />)}
            <line x1="50" y1="13" x2="50" y2="87" className={styles.radarAxis} /><line x1="13" y1="50" x2="87" y2="50" className={styles.radarAxis} />
            <polygon points={radarPoints} className={styles.radarShape} />
            {overview.skills.map((skill) => { const point = pointForSkill(skill); const axis = radarCoordinates[skill.key]; return <g key={skill.key}><circle cx={point.x} cy={point.y} r="2.4" className={skill.key === selectedSkill.key ? styles.radarPointActive : styles.radarPoint} /><text x={axis.labelX} y={axis.labelY} textAnchor={skill.key === "GRAMMAR" ? "end" : skill.key === "VOCABULARY" ? "start" : "middle"} className={styles.radarLabel}>{skill.label}</text></g>; })}
          </svg>
          <p className={styles.radarNote}>0% means there is no saved completion for that skill yet.</p>
        </div>
        <div className={styles.skillPanel}>
          <div className={styles.skillButtons} role="tablist" aria-label="Choose a learning competency">
            {overview.skills.map((skill) => <button key={skill.key} type="button" role="tab" aria-selected={selectedSkill.key === skill.key} className={selectedSkill.key === skill.key ? styles.skillButtonActive : styles.skillButton} onClick={() => setSelectedSkillKey(skill.key)}><span>{skill.label}</span><strong>{skill.progress}%</strong></button>)}
          </div>
          <section className={styles.skillDetail} aria-live="polite">
            <p className={styles.eyebrow}>{selectedSkill.label}</p>
            <h4>{selectedSkill.lessonCount ? `${selectedSkill.progress}% learning progress` : "Ready for your first practice"}</h4>
            <dl><div><dt>Lessons tracked</dt><dd>{selectedSkill.lessonCount}</dd></div><div><dt>Completed</dt><dd>{selectedSkill.completedLessons}</dd></div><div><dt>Accuracy</dt><dd>{metricValue(selectedSkill.accuracy)}</dd></div><div><dt>Time practised</dt><dd>{selectedSkill.activeMinutes} min</dd></div></dl>
            <p>{selectedSkill.lessonCount ? "This chart updates when progress is saved in a lesson of this skill." : "Open a lesson of this skill to start building a real progress record."}</p>
          </section>
        </div>
      </div>
    </section>

    <section className={styles.weekSection} aria-labelledby="weekly-activity-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Last 7 days</p><h3 id="weekly-activity-heading">Learning rhythm</h3></div><span>Minutes studied</span></div>
      <div className={styles.weeklyChart} aria-label="Study minutes over the last 7 days">
        {overview.weeklyActivity.map((day) => <div key={day.date} className={styles.day}><div className={styles.barTrack}><div className={styles.bar} style={{ height: `${Math.max(day.minutes ? 10 : 0, Math.round((day.minutes / maxWeeklyMinutes) * 100))}%` }} title={`${day.minutes} minutes`} /></div><strong>{day.minutes}</strong><span>{day.label}</span><small>{day.lessonsCompleted ? `${day.lessonsCompleted} lesson${day.lessonsCompleted === 1 ? "" : "s"}` : "No lessons"}</small></div>)}
      </div>
    </section>
  </section>;
}
