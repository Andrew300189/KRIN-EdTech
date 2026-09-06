import Link from "next/link";
import styles from "./CourseLearningPath.module.css";

type Lesson = {
  id: string;
  slug: string;
  localizedSlug?: string | null;
  title: string;
  order: number;
};

type Module = {
  id: string;
  order: number;
  title: string;
  lessons: Lesson[];
};

type LessonAccess = {
  allowed: boolean;
  reason: string;
};

type LessonProgress = {
  status: string;
  completionPercent: number;
  experienceEarned?: number;
};

type Props = {
  modules: Module[];
  accessByLessonId: ReadonlyMap<string, LessonAccess | undefined>;
  progressByLessonId: ReadonlyMap<string, LessonProgress | undefined>;
  coursePath: string;
  locale?: string;
};

const copy = {
  en: { title: "Your learning path", subtitle: "Complete a level to clear the path ahead.", module: "Module", completed: "Completed", inProgress: "In progress", available: "Start", locked: "In the fog", xp: "XP" },
  uk: { title: "Ваш маршрут навчання", subtitle: "Пройдіть рівень, щоб відкрити шлях далі.", module: "Модуль", completed: "Пройдено", inProgress: "У процесі", available: "Почати", locked: "У тумані", xp: "XP" },
  ru: { title: "Ваш маршрут обучения", subtitle: "Пройдите уровень, чтобы открыть путь дальше.", module: "Модуль", completed: "Пройдено", inProgress: "В процессе", available: "Начать", locked: "В тумане", xp: "XP" },
} as const;

function localizedCopy(locale?: string) {
  const key = locale?.toLowerCase().startsWith("uk") ? "uk" : locale?.toLowerCase().startsWith("ru") ? "ru" : "en";
  return copy[key];
}

/**
 * A visual lesson map. It only reflects server-calculated access; a locked
 * visual node has no link, and the lesson route independently repeats the
 * same access check before exposing its content.
 */
export function CourseLearningPath({ modules, accessByLessonId, progressByLessonId, coursePath, locale }: Props) {
  const text = localizedCopy(locale);
  let pathNumber = 0;

  return (
    <section className={styles.path} aria-labelledby="learning-path-title">
      <header className={styles.heading}>
        <div>
          <p>{text.subtitle}</p>
          <h2 id="learning-path-title">{text.title}</h2>
        </div>
        <span className={styles.compass} aria-hidden="true">✦</span>
      </header>
      <div className={styles.map}>
        {modules.map((module) => (
          <section key={module.id} className={styles.module} aria-label={`${text.module} ${module.order}: ${module.title}`}>
            <div className={styles.moduleHeading}><span>{text.module} {module.order}</span><strong>{module.title}</strong></div>
            <ol className={styles.nodes}>
              {module.lessons.map((lesson) => {
                pathNumber += 1;
                const access = accessByLessonId.get(lesson.id);
                const progress = progressByLessonId.get(lesson.id);
                const completed = progress?.status === "COMPLETED";
                const inProgress = !completed && Boolean(progress);
                const available = Boolean(access?.allowed);
                const state = completed ? "completed" : inProgress ? "inProgress" : available ? "available" : "locked";
                const stateLabel = completed ? text.completed : inProgress ? text.inProgress : available ? text.available : text.locked;
                const href = `${coursePath}/lessons/${lesson.localizedSlug ?? lesson.slug}`;
                const content = <>
                  <span className={styles.nodeIcon} aria-hidden="true">{completed ? "✓" : available ? pathNumber : "⌁"}</span>
                  <span className={styles.nodeCopy}><strong>{lesson.title}</strong><span>{stateLabel}{progress ? ` · ${progress.completionPercent}%` : ""}</span></span>
                  {progress?.experienceEarned ? <span className={styles.nodeXp}>+{progress.experienceEarned} {text.xp}</span> : null}
                </>;
                return <li key={lesson.id} className={`${styles.node} ${styles[state] ?? ""}`}>
                  {available ? <Link href={href} className={styles.nodeLink}>{content}</Link> : <span className={styles.lockedNode}>{content}<span className={styles.fog} aria-hidden="true" /></span>}
                </li>;
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
