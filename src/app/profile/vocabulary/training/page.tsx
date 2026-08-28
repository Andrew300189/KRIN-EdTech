import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { VocabularyTrainingPlayer } from "@/modules/vocabulary/components/VocabularyTrainingPlayer";
import { createVocabularyTrainingSession } from "@/modules/vocabulary/services/vocabulary.service";
import styles from "./VocabularyTrainingPage.module.css";

export default async function VocabularyTrainingPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/vocabulary/training");
  const requested = (await searchParams).session;
  const session = requested ? { id: requested } : await createVocabularyTrainingSession(authenticated.user.id, { source: "USER_SELECTED" });
  return <main className={styles.page}><header className={styles.header}><div><Link href="/student/vocabulary" className={styles.backLink}>← Мой словарь</Link><h1>Тренировка слов</h1><p>100 раундов по 20 коротких заданий. Переводите в обе стороны и собирайте английские слова и фразы из кубиков.</p></div><div className={styles.cycleBadge}><strong>100</strong><span>раундов</span></div></header>{session ? <VocabularyTrainingPlayer sessionId={session.id} cycleLength={100} /> : <section className={styles.empty}><h2>Слов для тренировки пока нет</h2><p>Добавьте английские слова или фразы в личный словарь — после этого здесь появится первый раунд.</p><Link href="/student/vocabulary">Открыть словарь</Link></section>}</main>;
}
