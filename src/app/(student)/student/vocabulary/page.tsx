import { requireRole } from "@/core/server/role-guard";
import { getUserVocabulary, getVocabularySettings, getVocabularyStatistics } from "@/modules/vocabulary/services/vocabulary.service";
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
    const [vocabulary, summary, settings] = await Promise.all([
      getUserVocabulary(guard.user.id, { pageSize: 4 }),
      getVocabularyStatistics(guard.user.id),
      getVocabularySettings(guard.user.id),
    ]);
    return <main className={styles.page}>
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
