import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { LocalizedText } from "@/core/i18n/LocalizedText";
import { listStreakQuestBooks } from "@/modules/motivation/services/streak-quest-book.service";
import { StreakQuestBooksPanel } from "@/modules/motivation/components/StreakQuestBooksPanel";
import styles from "@/app/profile/achievements/Achievements.module.css";

export default async function StudentQuestsPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  const books = await listStreakQuestBooks(guard.user.id);
  return <main className={styles.page}>
    <header className={styles.header}><div>
      <Link href="/student/achievements?section=COLLECTIONS">← <LocalizedText id="student.nav.achievements" fallback="Achievements" /></Link>
      <h1><LocalizedText id="student.achievements.quests" fallback="Quests" /></h1>
    </div></header>
    {books.length ? <StreakQuestBooksPanel initialBooks={books} /> : <section className={styles.collectionEmpty}><span aria-hidden="true">📖</span><div><h2><LocalizedText id="student.achievements.quests" fallback="Quests" /></h2><p><LocalizedText id="student.achievements.booksEmpty" fallback="New quests will appear here as you learn." /></p></div></section>}
  </main>;
}
