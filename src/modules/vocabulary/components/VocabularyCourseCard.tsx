"use client";

import Link from "next/link";
import { useLocale } from "@/core/i18n/locale";
import type { PublishedVocabularyCourse } from "@/modules/vocabulary/services/vocabulary-course-catalog.service";
import styles from "@/app/(student)/student/courses/StudentCourses.module.css";

type Props = {
  course: PublishedVocabularyCourse;
  variant: "student" | "profile";
};

export function VocabularyCourseCard({ course, variant }: Props) {
  const { locale } = useLocale();
  const preferred = locale === "uk" || locale === "ru" ? locale : course.language;
  const translation = course.translations.find((item) => item.locale === preferred);
  const fallbackTranslation = course.translations.find((item) => item.locale === course.language) ?? course.translations[0];
  const targetLocale = translation?.locale ?? fallbackTranslation?.locale;
  const href = course.firstLessonSlug && (targetLocale === "uk" || targetLocale === "ru")
    ? `/${targetLocale}/courses/${course.slug}/lessons/${course.firstLessonSlug}`
    : `/student/courses/${course.slug}`;
  const title = translation?.title ?? fallbackTranslation?.title ?? course.title;
  const description = translation?.shortDescription ?? fallbackTranslation?.shortDescription ?? course.shortDescription;
  const buttonLabel = locale === "uk" ? "Відкрити курс" : locale === "ru" ? "Открыть курс" : "Open course";

  if (variant === "student") {
    return <article className={styles.vocabularyCourseCard}>
      <span>{course.level.code} · {course.difficulty ?? "Vocabulary"}</span>
      <h2>{title}</h2><p>{description}</p>
      <Link href={href}>{buttonLabel} <span aria-hidden="true">→</span></Link>
    </article>;
  }

  return <article className="rounded-xl border border-violet-100 bg-white p-4">
    <p className="text-sm font-semibold text-violet-700">{course.level.code} · {course.difficulty ?? "Vocabulary"}</p>
    <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{description}</p>
    <Link className="mt-3 inline-flex rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800" href={href}>{buttonLabel}</Link>
  </article>;
}
