import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import { getPublicLearnerProfile, type PublicProfileLocale } from "@/modules/profile/services/public-learner-profile.service";
import styles from "./PublicLearnerProfile.module.css";

type Params = Promise<{ username: string }>;

const copy = {
  en: { back: "Leaderboard", eyebrow: "Learner profile", level: "Level", rankXp: "rank XP", streak: "day streak", learning: "Learning summary", completed: "Lessons completed", accuracy: "Accuracy", minutes: "Active minutes", courses: "Currently learning", progress: "complete", lesson: "lesson", lessons: "lessons", empty: "No active courses are shared yet.", privacy: "This learner chose to share this card. Email, balances, answers and private history stay hidden." },
  ru: { back: "Рейтинг", eyebrow: "Профиль ученика", level: "Уровень", rankXp: "XP рейтинга", streak: "дней серии", learning: "Обучение", completed: "Уроков пройдено", accuracy: "Точность", minutes: "Активных минут", courses: "Сейчас проходит", progress: "пройдено", lesson: "урок", lessons: "уроков", empty: "Пока нет активных курсов, которыми ученик решил поделиться.", privacy: "Ученик сам решил показать эту карточку. Email, балансы, ответы и личная история остаются скрытыми." },
  uk: { back: "Рейтинг", eyebrow: "Профіль учня", level: "Рівень", rankXp: "XP рейтингу", streak: "днів серії", learning: "Навчання", completed: "Уроків завершено", accuracy: "Точність", minutes: "Активних хвилин", courses: "Зараз проходить", progress: "пройдено", lesson: "урок", lessons: "уроків", empty: "Поки немає активних курсів, якими учень вирішив поділитися.", privacy: "Учень сам вирішив показати цю картку. Email, баланси, відповіді та приватна історія залишаються прихованими." },
} as const;

function viewerLocale(value: string | null | undefined): PublicProfileLocale {
  return value === "ru" || value === "uk" ? value : "en";
}

function initials(name: string) {
  return name.slice(0, 2).toLocaleUpperCase() || "?";
}

export default async function PublicLearnerProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const authenticated = await requireAuth();
  const currentPath = `/u/${encodeURIComponent(username)}`;
  if (!authenticated) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const locale = viewerLocale(authenticated.user.interfaceLanguage);
  const text = copy[locale];
  const profile = await getPublicLearnerProfile(username, locale);
  if (!profile) notFound();

  const shopAvatar = shopAvatarDetails(profile.learner.shopAvatarId);
  const numberFormat = new Intl.NumberFormat(locale);
  return <main className={styles.page}>
    <Link href="/leaderboard" className={styles.back}>← {text.back}</Link>
    <section className={styles.hero} aria-labelledby="learner-profile-name">
      <div className={styles.avatar} aria-label={`${profile.learner.displayName} avatar`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- profile photos can be safe data URLs as well as HTTPS URLs. */}
        {profile.learner.avatar ? <img src={profile.learner.avatar} alt="" /> : shopAvatar ? shopAvatar.glyph : initials(profile.learner.displayName)}
      </div>
      <div className={styles.identity}>
        <p>{text.eyebrow}</p>
        <h1 id="learner-profile-name">{profile.learner.displayName}</h1>
        <span>@{profile.learner.username}</span>
      </div>
      <div className={styles.level}><span>{text.level}</span><strong>{profile.learner.level}</strong></div>
    </section>

    <section className={styles.overview} aria-label={text.learning}>
      <article><span>✦</span><div><strong>{numberFormat.format(profile.learner.rankExperience)}</strong><small>{text.rankXp}</small></div></article>
      <article><span>🔥</span><div><strong>{numberFormat.format(profile.learner.currentStreak)}</strong><small>{text.streak}</small></div></article>
      <article><span>✓</span><div><strong>{numberFormat.format(profile.stats.completedLessons)}</strong><small>{text.completed}</small></div></article>
      <article><span>◷</span><div><strong>{profile.stats.accuracy === null ? "—" : `${profile.stats.accuracy}%`}</strong><small>{text.accuracy}</small></div></article>
      <article><span>◴</span><div><strong>{numberFormat.format(profile.stats.activeMinutes)}</strong><small>{text.minutes}</small></div></article>
    </section>

    <section className={styles.courses} aria-labelledby="learner-courses-title">
      <div className={styles.sectionHeading}><div><p>{text.learning}</p><h2 id="learner-courses-title">{text.courses}</h2></div><span>{profile.courses.length}</span></div>
      {profile.courses.length ? <div className={styles.courseGrid}>{profile.courses.map((course) => <article key={course.id} className={styles.courseCard}>
        <div className={styles.courseTitle}><h3>{course.title}</h3><strong>{course.completionPercent}%</strong></div>
        <div className={styles.progress} role="progressbar" aria-label={`${course.title}: ${course.completionPercent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.completionPercent}><span style={{ width: `${course.completionPercent}%` }} /></div>
        <p>{course.completedLessons}/{course.totalLessons || "—"} {course.totalLessons === 1 ? text.lesson : text.lessons} {text.progress}</p>
        <Link href={`/courses/${course.slug}`} className={styles.courseLink}>{course.title} →</Link>
      </article>)}</div> : <p className={styles.empty}>{text.empty}</p>}
    </section>
    <p className={styles.privacy}>{text.privacy}</p>
  </main>;
}
