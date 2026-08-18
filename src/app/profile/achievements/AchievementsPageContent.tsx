import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { listUserAchievements } from "@/modules/motivation/services/motivation.service";
import styles from "./Achievements.module.css";

type AchievementFilter = "ALL" | "EARNED" | "IN_PROGRESS" | "HIDDEN" | "TROPHIES";
export type AchievementSearchParams = Promise<{ filter?: string }>;

const filters: Array<{ value: AchievementFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "EARNED", label: "Earned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "TROPHIES", label: "Trophies" },
];

const rarityClass = {
  COMMON: styles.common,
  RARE: styles.rare,
  EPIC: styles.epic,
  LEGENDARY: styles.legendary,
} as const;

export async function AchievementsPageContent({
  searchParams,
  basePath = "/profile/achievements",
}: {
  searchParams: AchievementSearchParams;
  basePath?: string;
}) {
  const authenticated = await requireAuth();
  if (!authenticated) redirect(`/login?next=${encodeURIComponent(basePath)}`);
  const requestedFilter = (await searchParams).filter;
  const filter = filters.some((item) => item.value === requestedFilter) ? requestedFilter as AchievementFilter : "ALL";
  const achievements = await listUserAchievements(authenticated.user.id, filter);
  const completedCount = achievements.filter((achievement) => achievement.completed).length;
  const inProgressCount = achievements.filter((achievement) => !achievement.completed && !achievement.isHidden).length;
  const trophyCount = achievements.filter((achievement) => achievement.completed && achievement.isTrophy).length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Learning milestones</p>
        <h1>Achievements</h1>
        <p>Track the learning habits and milestones you have earned along the way.</p>
      </div>
      <dl className={styles.summary} aria-label="Achievement overview">
        <div><dt>Unlocked</dt><dd>{completedCount}</dd></div>
        <div><dt>In progress</dt><dd>{inProgressCount}</dd></div>
        <div><dt>Trophies</dt><dd>{trophyCount}</dd></div>
      </dl>
    </header>

    <nav className={styles.filters} aria-label="Filter achievements">
      {filters.map((item) => <Link key={item.value} href={`${basePath}?filter=${item.value}`} aria-current={filter === item.value ? "page" : undefined} className={filter === item.value ? styles.filterActive : styles.filter}>{item.label}</Link>)}
    </nav>

    {achievements.length ? <section className={styles.grid} aria-label="Achievement collection">
      {achievements.map((achievement) => {
        const progress = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
        const locked = achievement.isHidden && !achievement.completed;
        const rarity = rarityClass[achievement.rarity as keyof typeof rarityClass] ?? styles.common;
        return <article key={achievement.id} className={`${styles.card} ${achievement.completed ? styles.cardComplete : ""} ${locked ? styles.cardLocked : ""}`}>
          <div className={styles.cardTop}>
            <div className={`${styles.icon} ${rarity}`} aria-hidden="true">{locked ? "🔒" : achievement.icon}</div>
            <div className={styles.cardMeta}><span className={`${styles.rarity} ${rarity}`}>{achievement.rarity.toLowerCase()}</span>{achievement.isTrophy ? <span className={styles.trophy}>Trophy</span> : null}</div>
          </div>
          <h2>{achievement.title}</h2>
          <p className={styles.description}>{achievement.description}</p>
          <div className={styles.progressHeader}><span>{achievement.completed ? "Completed" : `${Math.min(achievement.progress, achievement.target)} / ${achievement.target}`}</span><strong>{progress}%</strong></div>
          <div className={styles.progressTrack} role="progressbar" aria-label={`${achievement.title} progress`} aria-valuemin={0} aria-valuemax={achievement.target} aria-valuenow={Math.min(achievement.progress, achievement.target)}><div className={`${styles.progressFill} ${rarity}`} style={{ width: `${progress}%` }} /></div>
          <footer className={styles.cardFooter}>
            <span className={styles.reward}>+{achievement.experienceReward} XP · +{achievement.coinReward} coins</span>
            <span className={achievement.completed ? styles.unlocked : styles.progressState}>{achievement.completed ? `Unlocked ${achievement.completedAt?.toLocaleDateString() ?? ""}` : locked ? "Keep learning to reveal it" : "In progress"}</span>
          </footer>
        </article>;
      })}
    </section> : <section className={styles.emptyState}><div aria-hidden="true">🏅</div><h2>No achievements in this view yet</h2><p>Complete lessons and vocabulary practice to start building your collection.</p><Link href="/student/courses">Open my courses</Link></section>}
  </main>;
}
