import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { getUserVocabulary, getVocabularySettings, getVocabularyStatistics } from "@/modules/vocabulary/services/vocabulary.service";
import { listPublishedVocabularyCourses } from "@/modules/vocabulary/services/vocabulary-course-catalog.service";
import { StudentVocabularySection, type VocabularyPreviewItem } from "../courses/StudentVocabularySection";
import styles from "../courses/StudentCourses.module.css";

function toVocabularyPreview(item: Awaited<ReturnType<typeof getUserVocabulary>>["items"][number]): VocabularyPreviewItem {
  if (item.kind === "GLOBAL") {
    const word = item.word;
    return {
      id: item.id,
      kind: item.kind,
      term: word?.lemma ?? "Word",
      translation: word?.meanings[0]?.translation ?? word?.meanings[0]?.definition ?? "No meaning yet",
      status: item.status,
      masteryLevel: item.masteryLevel,
    };
  }
  return {
    id: item.id,
    kind: item.kind,
    term: item.term,
    translation: item.translation,
    status: item.status,
    masteryLevel: item.masteryLevel,
  };
}

export default async function StudentVocabularyPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  try {
    const [vocabulary, summary, settings, courses] = await Promise.all([
      getUserVocabulary(guard.user.id, { pageSize: 4 }),
      getVocabularyStatistics(guard.user.id),
      getVocabularySettings(guard.user.id),
      listPublishedVocabularyCourses(),
    ]);
    return <main className={styles.page}>
      {courses.length ? <section className={styles.vocabularyCourses} aria-labelledby="vocabulary-courses-title">
        <div><p className={styles.eyebrow}>Guided vocabulary courses</p><h1 id="vocabulary-courses-title">Learn words in a course</h1><p>Pronunciation, translation and structured recall — separate from your personal dictionary.</p></div>
        <div className={styles.vocabularyCourseGrid}>{courses.map((course) => <article key={course.id} className={styles.vocabularyCourseCard}>
          <span>{course.level.code} · {course.difficulty ?? "Vocabulary"}</span><h2>{course.title}</h2><p>{course.shortDescription}</p>
          {course.firstLessonSlug ? <Link href={`/courses/${course.slug}/lessons/${course.firstLessonSlug}`}>Open course <span aria-hidden="true">→</span></Link> : null}
        </article>)}</div>
      </section> : null}
      <StudentVocabularySection
        initialItems={vocabulary.items.slice(0, 4).map(toVocabularyPreview)}
        summary={{ total: summary.total, newCount: summary.newCount, learning: summary.learning, mastered: summary.mastered, due: summary.due }}
        initialSettings={{ dailyGoal: settings.dailyGoal, maxSessionSize: settings.maxSessionSize, showTranscription: settings.showTranscription, dailyReminderEnabled: settings.dailyReminderEnabled }}
      />
    </main>;
  } catch {
    return <main className={styles.page}><section className={styles.errorState} role="alert"><div><strong>Vocabulary could not be loaded</strong><p>Try refreshing the page.</p></div></section></main>;
  }
}
