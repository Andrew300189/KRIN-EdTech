"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonTemplateDefinition } from "@/modules/cms/data/lesson-template-catalog";
import styles from "./CmsLessonTemplateLibrary.module.css";

type Module = {
  id: string;
  title: string;
  course: { title: string };
};

type CreatedLesson = {
  id: string;
  title: string;
};

export function CmsLessonTemplateSectionWorkspace({
  section,
  templates,
  modules,
}: {
  section: { id: string; title: string; description: string | null };
  templates: readonly LessonTemplateDefinition[];
  modules: Module[];
}) {
  const router = useRouter();
  const [targetByTemplate, setTargetByTemplate] = useState<Record<string, string>>({});
  const [createdByTemplate, setCreatedByTemplate] = useState<Record<string, CreatedLesson>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function instantiate(templateKey: string) {
    const targetModuleId = targetByTemplate[templateKey];
    if (!targetModuleId) {
      setMessage("Choose a course module for the new draft lesson.");
      return;
    }

    setPendingAction(`create:${templateKey}`);
    setMessage(null);
    let createdLesson: CreatedLesson | null = null;
    try {
      const response = await fetch(`/api/admin/cms/lesson-templates/${templateKey}/instantiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetModuleId }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: CreatedLesson; error?: string } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Unable to create the lesson draft.");
      }
      createdLesson = payload.data;
      setCreatedByTemplate((current) => ({ ...current, [templateKey]: createdLesson as CreatedLesson }));
      setMessage("Draft lesson created from the selected template.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create the lesson draft.");
    } finally {
      setPendingAction(null);
    }

    if (createdLesson) {
      router.push(`/cms/lessons/${createdLesson.id}`);
    }
  }

  async function remove(templateKey: string) {
    setPendingAction(`remove:${templateKey}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/cms/lesson-template-sections/${section.id}/templates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to remove the lesson template.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove the lesson template.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-label="Section actions">
        <div className={styles.templateHeader}>
          <div>
            <p className={styles.eyebrow}>Section</p>
            <h2 className={styles.title}>{section.title}</h2>
            <p className={styles.description}>{section.description || "Use this page to keep related reusable lesson templates together."}</p>
          </div>
          <div className={styles.templateTopActions}>
            <Link href="/cms/lesson-templates" className={styles.secondaryButton}>All sections</Link>
            <Link href="/cms/lesson-templates" className={styles.button}>Add templates</Link>
          </div>
        </div>
        {message ? <p className={`${styles.status} ${message.includes("Unable") || message.includes("Choose") ? styles.error : ""}`} role="status">{message}</p> : null}
      </section>

      <section className={styles.panel} aria-labelledby="section-templates-heading">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Stored templates</p>
            <h2 id="section-templates-heading" className={styles.title}>Create a new draft when you need it</h2>
            <p className={styles.description}>The original template is never changed. Each creation produces a separate draft lesson in the module you choose.</p>
          </div>
        </div>
        {templates.length ? (
          <div className={styles.templateGrid}>
            {templates.map((template) => {
              const created = createdByTemplate[template.key];
              const isCreating = pendingAction === `create:${template.key}`;
              return (
                <article key={template.key} className={styles.templateCard}>
                  <div>
                    <span className={styles.templateMeta}>{template.lessonType} · {template.estimatedDuration} min · {template.exerciseCount} activities</span>
                    <h3>{template.title}</h3>
                    <p>{template.description}</p>
                    <div className={styles.tagList}>{template.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div>
                  </div>
                  <div className={styles.templateFooter}>
                    {modules.length ? <select aria-label={`Target module for ${template.title}`} className={styles.templateSelect} value={targetByTemplate[template.key] ?? ""} onChange={(event) => setTargetByTemplate((current) => ({ ...current, [template.key]: event.target.value }))}><option value="">Choose target module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.course.title} · {module.title}</option>)}</select> : <p className={styles.status}>Create a course and module first, then return here to make the lesson draft. <Link href="/cms/courses/new">Open course builder</Link></p>}
                    {modules.length ? (
                      <button type="button" className={`${styles.button}${isCreating ? ` ${styles.pendingButton}` : ""}`} disabled={isCreating} aria-busy={isCreating || undefined} onClick={() => void instantiate(template.key)}>{isCreating ? "Creating…" : "Create draft lesson"}</button>
                    ) : (
                      <Link href="/cms/courses/new" className={styles.button}>Create course module first</Link>
                    )}
                    <button type="button" className={styles.removeButton} disabled={pendingAction === `remove:${template.key}`} onClick={() => void remove(template.key)}>{pendingAction === `remove:${template.key}` ? "Removing…" : "Remove from section"}</button>
                    {created ? <div className={styles.createdLinks}><Link href={`/cms/lessons/${created.id}`}>Open editor</Link><Link href={`/cms/preview/lessons/${created.id}`}>Preview lesson</Link></div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className={styles.empty}>This section is empty. Return to Lesson templates and choose a template to add here.</p>}
      </section>
    </div>
  );
}
