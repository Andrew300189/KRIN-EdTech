"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./CmsCourseLocalizationPanel.module.css";

type LocaleSummary = {
  code: string;
  displayName: string;
  nativeName: string;
  isBase: boolean;
  exists: boolean;
  status: string | null;
  translatedUnits: number;
  publishedUnits: number;
};

type Props = { courseId: string; totalUnits: number; locales: LocaleSummary[] };

async function actionRequest(courseId: string, body: unknown) {
  const response = await fetch(`/api/admin/cms/courses/${courseId}/translations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to update course localization.");
}

export function CmsCourseLocalizationPanel({ courseId, totalUnits, locales }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(locale: string, action: "CREATE_DRAFT" | "PUBLISH" | "UNPUBLISH") {
    startTransition(async () => {
      try {
        setMessage(null);
        await actionRequest(courseId, { locale, action });
        if (action === "CREATE_DRAFT") {
          router.push(`/cms/translations?course=${courseId}&locale=${locale}`);
          return;
        }
        setMessage(action === "CREATE_DRAFT" ? `${locale.toUpperCase()} draft created from the English source.` : action === "PUBLISH" ? `${locale.toUpperCase()} is now live.` : `${locale.toUpperCase()} was unpublished.`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update course localization.");
      }
    });
  }

  return (
    <section className={styles.panel} aria-labelledby="course-localization-title">
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Learner content</p>
          <h2 id="course-localization-title">Course translations</h2>
          <button
            type="button"
            className={styles.expandButton}
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-controls="course-translation-locales"
          >
            {isExpanded ? "Hide languages" : `Show ${locales.length} languages`}
            <span className={isExpanded ? styles.chevronOpen : styles.chevron} aria-hidden="true">⌄</span>
          </button>
        </div>
        <Link href={`/cms/translations?course=${courseId}`} className={styles.workspaceLink}>Open workspace <span aria-hidden="true">→</span></Link>
      </header>

      {isExpanded ? <>
        {message ? <p className={styles.message} aria-live="polite">{message}</p> : null}

      <div id="course-translation-locales" className={styles.localeGrid}>
        {locales.map((locale) => {
          const status = locale.isBase ? "Base" : locale.status ?? "Not started";
          const tone = locale.isBase ? styles.base : locale.status === "PUBLISHED" ? styles.published : styles.draft;

          return (
            <article key={locale.code} className={`${styles.localeCard} ${tone}`}>
              <div className={styles.cardTopline}>
                <div className={styles.localeTitle}>
                  <span className={styles.localeCode}>{locale.code}</span>
                  <div><h3>{locale.nativeName}</h3><p>{locale.displayName}</p></div>
                </div>
                <span className={styles.status}>{status}</span>
              </div>

              <p className={styles.progress}>
                {locale.isBase
                  ? "Source language"
                  : `${locale.translatedUnits}/${totalUnits} draft · ${locale.publishedUnits}/${totalUnits} live`}
              </p>

              {!locale.isBase ? (
                <div className={styles.actions}>
                  {!locale.exists ? (
                    <button type="button" disabled={isPending} onClick={() => run(locale.code, "CREATE_DRAFT")} className={styles.primaryAction}>Create draft</button>
                  ) : (
                    <>
                      <Link href={`/cms/translations?course=${courseId}&locale=${locale.code}`} className={styles.secondaryAction}>Edit</Link>
                      <button type="button" disabled={isPending} onClick={() => run(locale.code, locale.status === "PUBLISHED" ? "UNPUBLISH" : "PUBLISH")} className={styles.secondaryAction}>{locale.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      </> : null}
    </section>
  );
}
