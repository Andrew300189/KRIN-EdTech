import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Flame, Medal, ShieldCheck, Sparkles, Star, Trophy } from "lucide-react";
import { requireAuth } from "@/core/server/session";
import { LocalizedText } from "@/core/i18n/LocalizedText";
import { listUserAchievements } from "@/modules/motivation/services/motivation.service";
import { listStreakQuestBooks } from "@/modules/motivation/services/streak-quest-book.service";
import { listOpenedMilestoneChests } from "@/modules/motivation/services/reward-economy.service";
import { OpenedMilestoneChests } from "@/modules/motivation/components/OpenedMilestoneChests";
import { MistakeCorrectionAchievements } from "@/modules/motivation/components/MistakeCorrectionAchievements";
import { StreakQuestBooksPanel } from "@/modules/motivation/components/StreakQuestBooksPanel";
import { MilestoneChestsPanel } from "@/modules/motivation/components/MilestoneChestsPanel";
import { FlowerCollectionLink } from "@/modules/motivation/components/FlowerCollection";
import { QuestActivationButton } from "./QuestActivationButton";
import styles from "./Achievements.module.css";

type AchievementFilter = "ALL" | "AVAILABLE" | "ACTIVE" | "COMPLETED";
type AchievementSection = "GOALS" | "REWARDS" | "COLLECTIONS";
export type AchievementSearchParams = Promise<{ filter?: string; section?: string }>;

const sections: Array<{ value: AchievementSection; icon: string; titleKey: string; title: string; descriptionKey: string; description: string }> = [
  { value: "GOALS", icon: "✦", titleKey: "student.achievements.goals", title: "Goals", descriptionKey: "student.achievements.goalsDescription", description: "Quests and correction milestones" },
  { value: "REWARDS", icon: "🎁", titleKey: "student.achievements.rewards", title: "Chests", descriptionKey: "student.achievements.rewardsDescription", description: "Upcoming and opened chests" },
  { value: "COLLECTIONS", icon: "🌸", titleKey: "student.achievements.collections", title: "Collections", descriptionKey: "student.achievements.collectionsDescription", description: "Flowers and quest books" },
];

const filters: Array<{ value: AchievementFilter; label: string; labelKey: "student.achievements.all" | "student.achievements.available" | "student.achievements.active" | "student.achievements.completed" }> = [
  { value: "ALL", label: "All", labelKey: "student.achievements.all" },
  { value: "AVAILABLE", label: "Available", labelKey: "student.achievements.available" },
  { value: "ACTIVE", label: "Active", labelKey: "student.achievements.active" },
  { value: "COMPLETED", label: "Completed", labelKey: "student.achievements.completed" },
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
  const query = await searchParams;
  const requestedFilter = query.filter;
  const filter = filters.some((item) => item.value === requestedFilter) ? requestedFilter as AchievementFilter : "ALL";
  const section = sections.some((item) => item.value === query.section) ? query.section as AchievementSection : "GOALS";
  const [allAchievements, questBooks, openedChests] = await Promise.all([
    listUserAchievements(authenticated.user.id),
    listStreakQuestBooks(authenticated.user.id),
    listOpenedMilestoneChests(authenticated.user.id),
  ]);
  const completedCount = allAchievements.filter((achievement) => achievement.completed).length;
  const activeCount = allAchievements.filter((achievement) => achievement.activatedAt && !achievement.completed).length;
  const availableCount = allAchievements.filter((achievement) => !achievement.activatedAt && !achievement.completed).length;
  const achievements = allAchievements.filter((achievement) => filter === "ALL"
    || (filter === "AVAILABLE" && !achievement.activatedAt && !achievement.completed)
    || (filter === "ACTIVE" && Boolean(achievement.activatedAt) && !achievement.completed)
    || (filter === "COMPLETED" && achievement.completed));

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}><LocalizedText id="student.achievements.eyebrow" fallback="Your learning rewards" /></p>
        <h1><LocalizedText id="student.nav.achievements" fallback="Achievements" /></h1>
        <p><LocalizedText id="student.achievements.intro" fallback="Goals, flower chests, books and collections are gathered here." /></p>
      </div>
    </header>

    <nav className={styles.sectionTabs} aria-label="Achievement sections">
      {sections.map((item) => <Link key={item.value} href={`${basePath}?section=${item.value}`} aria-current={section === item.value ? "page" : undefined} className={`${styles.sectionTab} ${section === item.value ? styles.sectionTabActive : ""}`}>
        <span className={styles.sectionTabIcon} aria-hidden="true">{item.icon}</span>
        <span className={styles.sectionTabCopy}><strong><LocalizedText id={item.titleKey} fallback={item.title} /></strong><small><LocalizedText id={item.descriptionKey} fallback={item.description} /></small></span>
      </Link>)}
    </nav>

    {section === "REWARDS" ? <div className={styles.sectionPanel}>
      <MilestoneChestsPanel />
      <OpenedMilestoneChests chests={openedChests.map((chest) => ({ ...chest, openedAt: chest.openedAt.toISOString() }))} />
    </div> : null}

    {section === "COLLECTIONS" ? <div className={styles.sectionPanel}>
      <FlowerCollectionLink />
      {questBooks.length ? <StreakQuestBooksPanel initialBooks={questBooks} /> : <section className={styles.collectionEmpty}>
        <span aria-hidden="true">📖</span>
        <div><h2><LocalizedText id="student.achievements.books" fallback="Quest books" /></h2><p><LocalizedText id="student.achievements.booksEmpty" fallback="Quest books you discover while learning will appear here." /></p></div>
      </section>}
    </div> : null}

    {section === "GOALS" ? <div className={styles.sectionPanel}>
      <section className={styles.goalsSection} aria-labelledby="achievement-goals-title">
        <h2 id="achievement-goals-title"><LocalizedText id="student.achievements.quests" fallback="Quests" /></h2>
        <dl className={styles.summary} aria-label="Quest overview">
          <div><dt><LocalizedText id="student.achievements.available" fallback="Available" /></dt><dd>{availableCount}</dd></div>
          <div><dt><LocalizedText id="student.achievements.active" fallback="Active" /></dt><dd>{activeCount}</dd></div>
          <div><dt><LocalizedText id="student.achievements.completed" fallback="Completed" /></dt><dd>{completedCount}</dd></div>
        </dl>
        <nav className={styles.filters} aria-label="Filter achievement goals">
          {filters.map((item) => <Link key={item.value} href={`${basePath}?section=GOALS&filter=${item.value}`} aria-current={filter === item.value ? "page" : undefined} className={filter === item.value ? styles.filterActive : styles.filter}><LocalizedText id={item.labelKey} fallback={item.label} /></Link>)}
        </nav>

        {achievements.length ? <section className={styles.grid} aria-label="Quest collection">
          {achievements.map((achievement) => {
            const progress = Math.min(100, Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100));
            const rarity = rarityClass[achievement.rarity as keyof typeof rarityClass] ?? styles.common;
            const isAvailable = !achievement.activatedAt && !achievement.completed;
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
        </section> : <section className={styles.emptyState}><div aria-hidden="true">✦</div><h2>No goals in this view yet</h2><p>Choose a different filter or return after new goals are added.</p><Link href="/student/courses">Open my courses</Link></section>}
      </section>
      <MistakeCorrectionAchievements />
    </div> : null}
  </main>;
}
