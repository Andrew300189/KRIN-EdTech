"use client";

import Link from "next/link";
import { useLocale } from "@/core/i18n/locale";
import styles from "./StudentCourseDetail.module.css";

type Course = {
  slug: string;
  title: string;
  description: string;
  level: string;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  nextLesson: { title: string } | null;
};

const copy = {
  en: { back: "My courses", label: "Your learning path", progress: "Course progress", lessons: "lessons completed", next: "Up next", ready: "Your next step is ready", complete: "Course completed", completeCopy: "Great work — you can revisit any lesson whenever you want.", openMenu: "Open course menu", continue: "Continue learning", review: "Review course" },
  ru: { back: "Мои курсы", label: "Ваш учебный путь", progress: "Прогресс курса", lessons: "уроков пройдено", next: "Дальше", ready: "Следующий шаг уже готов", complete: "Курс завершён", completeCopy: "Отличная работа — к любому уроку можно вернуться в любое время.", openMenu: "Открыть меню курса", continue: "Продолжить обучение", review: "Повторить курс" },
  uk: { back: "Мої курси", label: "Ваш навчальний шлях", progress: "Прогрес курсу", lessons: "уроків пройдено", next: "Далі", ready: "Наступний крок уже готовий", complete: "Курс завершено", completeCopy: "Чудова робота — до будь-якого уроку можна повернутися будь-коли.", openMenu: "Відкрити меню курсу", continue: "Продовжити навчання", review: "Повторити курс" },
} as const;

export function StudentCourseDetail({ course, continueHref }: { course: Course; continueHref: string }) {
  const { locale } = useLocale();
  const language = locale === "uk" || locale === "ru" ? locale : "en";
  const text = copy[language];
  const isComplete = course.totalLessons > 0 && course.progress >= 100;
  const nextLabel = course.nextLesson?.title ?? (isComplete ? text.completeCopy : text.ready);

  return <section className={styles.page} aria-labelledby="student-course-title">
    <Link href="/student/courses" className={styles.backLink}>← {text.back}</Link>
    <article className={styles.courseCard}>
      <div className={styles.courseArt} aria-hidden="true"><span>{course.level}</span><i>abc</i></div>
      <div className={styles.content}>
        <div className={styles.topLine}><span className={styles.eyebrow}>{text.label}</span><span className={styles.category}>{course.category}</span></div>
        <h2 id="student-course-title">{course.title}</h2>
        <p className={styles.description}>{course.description}</p>
        <section className={styles.progressSection} aria-label={text.progress}>
          <div className={styles.progressHeading}><span>{text.progress}</span><strong>{course.progress}%</strong></div>
          <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }} /></div>
          <div className={styles.progressMeta}><span><strong>{course.completedLessons}</strong> / {course.totalLessons} {text.lessons}</span><span className={isComplete ? styles.completeStatus : styles.activeStatus}>{isComplete ? text.complete : text.ready}</span></div>
        </section>
        <section className={styles.nextLesson}><span>{text.next}</span><strong>{nextLabel}</strong></section>
        <div className={styles.actions}>
          <Link href={`/courses/${encodeURIComponent(course.slug)}?content=open`} className={styles.menuAction}><span aria-hidden="true">☰</span>{text.openMenu}</Link>
          <Link href={continueHref} className={styles.continueAction}><span>{isComplete ? text.review : text.continue}</span><span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </article>
  </section>;
}
