import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsExerciseTemplateLibrary } from "@/modules/cms/components/CmsExerciseTemplateLibrary";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import styles from "@/modules/cms/components/CmsExerciseTemplates.module.css";
import { EXERCISE_ENGINES } from "@/modules/cms/exercise-engines/registry";

export default async function CmsExerciseTemplatesPage() {
  const [templates, lessons] = await Promise.all([
    prisma.cmsExerciseTemplate.findMany({
      where: { isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, description: true, engineKey: true, type: true, isArchived: true },
    }),
    prisma.lesson.findMany({
      take: 300,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, module: { select: { title: true, course: { select: { title: true } } } } },
    }),
  ]);

  return (
    <CmsPageShell
      eyebrow="Exercise system"
      title="Exercise templates"
      description="Choose an exercise engine, configure language values and test its real answer-checking behaviour. Digits are blocked in the sandbox."
      actions={<Link href="/cms/lesson-templates" className={styles.headerAction}>Lesson templates</Link>}
    >
      <section className={styles.librarySection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Interactive engine catalogue</h2>
            <p className={styles.sectionDescription}>Every card opens its own authoring sandbox. Testing never changes course content.</p>
          </div>
          <span className={styles.countBadge}>{EXERCISE_ENGINES.length} engines</span>
        </div>
        <div className={styles.engineGrid}>
          {EXERCISE_ENGINES.map((engine) => (
            <Link key={engine.key} href={`/cms/exercise-templates/${engine.key}`} className={styles.engineCard}>
              <div>
                <p className={styles.engineCode}>{engine.engine}</p>
                <h3 className={styles.engineTitle}>{engine.title}</h3>
                <p className={styles.engineDescription}>{engine.description}</p>
              </div>
              <span className={styles.cardLink}>Open sandbox <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>
      <CmsExerciseTemplateLibrary templates={templates} lessons={lessons} />
    </CmsPageShell>
  );
}
