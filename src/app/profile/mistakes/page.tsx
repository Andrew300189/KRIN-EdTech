import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { prisma } from "@/core/server/prisma";
import { listUserMistakes } from "@/modules/courses/services/content.service";
import { MistakesGrid, type MistakeCardItem } from "./MistakesGrid";
import styles from "./Mistakes.module.css";

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function positionValue(value: string | string[] | undefined) {
  const rawValue = singleValue(value);
  if (!rawValue || !/^(?:0|[1-9]\d*)$/.test(rawValue)) return undefined;

  const position = Number(rawValue);
  return Number.isSafeInteger(position) ? position : undefined;
}

function toMistakeCard(mistake: {
  id: string;
  occurrenceCount: number;
  lastOccurredAt: Date;
  exercise: { question: string | null } | null;
  lesson: {
    title: string;
    slug: string;
    module: { course: { slug: string; title: string; level: { code: string } } };
  } | null;
}): MistakeCardItem {
  return {
    id: mistake.id,
    occurrenceCount: mistake.occurrenceCount,
    lastOccurredAt: mistake.lastOccurredAt.toISOString(),
    question: mistake.exercise?.question ?? null,
    lesson: mistake.lesson ? {
      title: mistake.lesson.title,
      slug: mistake.lesson.slug,
      course: {
        slug: mistake.lesson.module.course.slug,
        title: mistake.lesson.module.course.title,
        levelCode: mistake.lesson.module.course.level.code,
      },
    } : null,
  };
}

export default async function ProfileMistakesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    resolved?: string | string[];
    position?: string | string[];
  }>;
}) {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/mistakes");

  const currentSearchParams = await searchParams;
  const resolvedMistakeId = singleValue(currentSearchParams?.resolved);
  const recentlyResolvedPosition = positionValue(currentSearchParams?.position);
  const [mistakes, recentlyResolvedMistake] = await Promise.all([
    listUserMistakes(authenticated.user.id),
    resolvedMistakeId ? prisma.userMistake.findFirst({
      where: { id: resolvedMistakeId, userId: authenticated.user.id, resolvedAt: { not: null } },
      select: {
        id: true,
        occurrenceCount: true,
        lastOccurredAt: true,
        exercise: { select: { question: true } },
        lesson: { select: { title: true, slug: true, module: { select: { course: { select: { slug: true, title: true, level: { select: { code: true } } } } } } } },
      },
    }) : Promise.resolve(null),
  ]);
  const mistakeCards = mistakes.map(toMistakeCard);
  const resolvedCard = recentlyResolvedMistake ? toMistakeCard(recentlyResolvedMistake) : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true" />Review workspace</p>
          <h1>My mistakes</h1>
          <p>Turn recent mistakes into confident answers. Revisit any lesson whenever you are ready.</p>
        </div>
        <span className={styles.counter}><strong>{mistakes.length}</strong> {mistakes.length === 1 ? "item to review" : "items to review"}</span>
      </header>

      {mistakes.length === 0 && !resolvedCard ? (
        <section className={styles.emptyState} aria-label="No mistakes to review">
          <span className={styles.emptyIcon} aria-hidden="true">✓</span>
          <h2>You are all caught up</h2>
          <p>New mistakes will appear here with a clear explanation and a direct link back to the lesson.</p>
        </section>
      ) : (
        <MistakesGrid
          mistakes={mistakeCards}
          recentlyResolvedMistake={resolvedCard}
          recentlyResolvedPosition={recentlyResolvedPosition}
        />
      )}
    </main>
  );
}
