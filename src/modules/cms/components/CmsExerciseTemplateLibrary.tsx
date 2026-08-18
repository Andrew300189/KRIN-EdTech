"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./CmsExerciseTemplates.module.css";

type Template = { id: string; title: string; description: string | null; engineKey: string; type: string; isArchived: boolean };
type Lesson = { id: string; title: string; module: { title: string; course: { title: string } } };

export function CmsExerciseTemplateLibrary({ templates, lessons }: { templates: Template[]; lessons: Lesson[] }) {
  const router = useRouter();
  const [targetByTemplate, setTargetByTemplate] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function instantiate(templateId: string) {
    const targetLessonId = targetByTemplate[templateId];
    if (!targetLessonId) {
      setMessage("Choose a target lesson first.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cms/exercise-templates/${templateId}/instantiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLessonId }),
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to create exercise from template.");
        setMessage("Draft exercise created from template.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create exercise from template.");
      }
    });
  }

  return (
    <section className={styles.savedSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Saved exercise templates</h2>
          <p className={styles.sectionDescription}>Reusable configurations saved from your existing exercises.</p>
        </div>
        <span className={styles.countBadge}>{templates.length} saved</span>
      </div>
      {message ? <p role="status" className={styles.message}>{message}</p> : null}
      {templates.length ? (
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <article key={template.id} className={styles.templateCard}>
              <div>
                <p className={styles.engineCode}>{template.engineKey} · {template.type}</p>
                <h3 className={styles.engineTitle}>{template.title}</h3>
                {template.description ? <p className={styles.engineDescription}>{template.description}</p> : null}
              </div>
              <div className={styles.templateControls}>
                <Link href={`/cms/exercise-templates/${template.engineKey}`} className={styles.inlineLink}>Open sandbox <span aria-hidden="true">→</span></Link>
                <label className={styles.field}>
                  Target lesson
                  <select value={targetByTemplate[template.id] ?? ""} onChange={(event) => setTargetByTemplate((current) => ({ ...current, [template.id]: event.target.value }))} className={styles.select}>
                    <option value="">Choose lesson</option>
                    {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.module.course.title} · {lesson.module.title} · {lesson.title}</option>)}
                  </select>
                </label>
                <button type="button" disabled={isPending} onClick={() => instantiate(template.id)} className={styles.secondaryButton}>Create draft</button>
              </div>
            </article>
          ))}
        </div>
      ) : <p className={styles.emptyNote}>No saved templates yet. Save one from an exercise editor.</p>}
    </section>
  );
}
