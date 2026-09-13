import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Flame, Medal, ShieldCheck, Sparkles, Star, Trophy } from "lucide-react";
import { requireAuth } from "@/core/server/session";
import { listUserAchievements } from "@/modules/motivation/services/motivation.service";
import { QuestActivationButton } from "./QuestActivationButton";
import styles from "./Achievements.module.css";

type AchievementFilter = "ALL" | "AVAILABLE" | "ACTIVE" | "COMPLETED";
export type AchievementSearchParams = Promise<{ filter?: string }>;

const filters: Array<{ value: AchievementFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

const rarityClass = {
  COMMON: styles.common,
  RARE: styles.rare,
  EPIC: styles.epic,
  LEGENDARY: styles.legendary,
} as const;

/** Older achievement records may contain an icon token (for example
 * `spark` or `shield-check`) instead of an emoji. Never render that token as
 * visible copy: it wraps inside the icon badge and looks like broken data. */
function AchievementGlyph({ icon }: { icon: string }) {
  const normalized = icon.trim().toLowerCase();
  const Icon = normalized === "spark" || normalized === "sparkles"
    ? Sparkles
    : normalized === "shield-check" || normalized === "shield"
      ? ShieldCheck
      : normalized === "trophy"
        ? Trophy
        : normalized === "flame" || normalized === "fire"
          ? Flame
          : normalized === "star"
            ? Star
            : normalized === "award"
              ? Award
              : /^[a-z0-9-]+$/u.test(normalized) ? Medal : null;
  return Icon ? <Icon size={25} strokeWidth={2.25} /> : <>{icon}</>;
}

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
  const activeCount = achievements.filter((achievement) => achievement.activatedAt && !achievement.completed).length;
  const availableCount = achievements.filter((achievement) => !achievement.activatedAt).length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Choose your next goal</p>
        <h1>Quests</h1>
        <p>Activate a quest before you start it. Only progress made after activation counts.</p>
      </div>
      <dl className={styles.summary} aria-label="Quest overview">
        <div><dt>Available</dt><dd>{availableCount}</dd></div>
        <div><dt>Active</dt><dd>{activeCount}</dd></div>
        <div><dt>Completed</dt><dd>{completedCount}</dd></div>
      </dl>
    </header>

    <nav className={styles.filters} aria-label="Filter quests">
      {filters.map((item) => <Link key={item.value} href={`${basePath}?filter=${item.value}`} aria-current={filter === item.value ? "page" : undefined} className={filter === item.value ? styles.filterActive : styles.filter}>{item.label}</Link>)}
    </nav>

    {achievements.length ? <section className={styles.grid} aria-label="Quest collection">
      {achievements.map((achievement) => {
        const progress = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
        const rarity = rarityClass[achievement.rarity as keyof typeof rarityClass] ?? styles.common;
        const isAvailable = !achievement.activatedAt;
        const unlockLabel = achievement.unlockShopItemId === "theme-aurora"
          ? "Unlocks Aurora theme"
          : achievement.unlockShopItemId ? "Unlocks a site item" : null;
        return <article key={achievement.id} className={`${styles.card} ${achievement.completed ? styles.cardComplete : ""}`}>
          <div className={styles.cardTop}>
            <div className={`${styles.icon} ${rarity}`} aria-hidden="true"><AchievementGlyph icon={achievement.icon} /></div>
            <div className={styles.cardMeta}><span className={`${styles.rarity} ${rarity}`}>{achievement.rarity.toLowerCase()}</span></div>
          </div>
          <h2>{achievement.title}</h2>
          <p className={styles.description}>{achievement.description}</p>
          <div className={styles.progressHeader}><span>{achievement.completed ? "Completed" : isAvailable ? "Activate to start" : `${Math.min(achievement.progress, achievement.target)} / ${achievement.target}`}</span><strong>{isAvailable ? "—" : `${progress}%`}</strong></div>
          <div className={styles.progressTrack} role="progressbar" aria-label={`${achievement.title} progress`} aria-valuemin={0} aria-valuemax={achievement.target} aria-valuenow={Math.min(achievement.progress, achievement.target)}><div className={`${styles.progressFill} ${rarity}`} style={{ width: `${progress}%` }} /></div>
          <footer className={styles.cardFooter}>
            <span className={styles.reward}>+{achievement.experienceReward} XP{unlockLabel ? <><br /><span className={styles.unlock}>✦ {unlockLabel}</span></> : null}</span>
            {achievement.completed ? <span className={styles.unlocked}>Completed {achievement.completedAt?.toLocaleDateString() ?? ""}</span> : isAvailable ? <QuestActivationButton questId={achievement.id} /> : <span className={styles.progressState}>Quest active</span>}
          </footer>
        </article>;
      })}
    </section> : <section className={styles.emptyState}><div aria-hidden="true">✦</div><h2>No quests in this view yet</h2><p>Choose a different filter or return after new quests are added.</p><Link href="/student/courses">Open my courses</Link></section>}
  </main>;
}
