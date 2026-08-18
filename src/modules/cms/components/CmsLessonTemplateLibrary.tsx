"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonTemplateDefinition } from "@/modules/cms/data/lesson-template-catalog";
import styles from "./CmsLessonTemplateLibrary.module.css";

type Section = {
  id: string;
  title: string;
  description: string | null;
  _count: { items: number };
};

type CreatedSectionResponse = {
  data?: { id: string };
  error?: string;
};

export function CmsLessonTemplateLibrary({
  sections,
  templates,
}: {
  sections: Section[];
  templates: readonly LessonTemplateDefinition[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSectionByTemplate, setSelectedSectionByTemplate] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("create-section");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/cms/lesson-template-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const payload = (await response.json().catch(() => null)) as CreatedSectionResponse | null;
      if (!response.ok || !payload?.data?.id) {
        throw new Error(payload?.error ?? "Unable to create the section.");
      }
      router.push(`/cms/lesson-templates/${payload.data.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create the section.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addTemplate(templateKey: string) {
    const sectionId = selectedSectionByTemplate[templateKey];
    if (!sectionId) {
      setMessage("Choose the section that should store this lesson template.");
      return;
    }

    setPendingAction(templateKey);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/cms/lesson-template-sections/${sectionId}/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateKey }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to add the lesson template.");
      }
      router.push(`/cms/lesson-templates/${sectionId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add the lesson template.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="create-section-heading">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Organisation</p>
            <h2 id="create-section-heading" className={styles.title}>Create a lesson template section</h2>
            <p className={styles.description}>Give the section a name. It immediately receives its own CMS page, ready to hold the lesson templates you choose.</p>
          </div>
        </div>
        <form className={styles.form} onSubmit={createSection}>
          <div className={styles.formGrid}>
            <label className={styles.field}>Section name<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} required placeholder="For example: A1 grammar lessons" /></label>
            <label className={styles.field}>Description <span className="sr-only">optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} placeholder="Optional: explain what belongs in this section" /></label>
            <button type="submit" className={styles.button} disabled={pendingAction === "create-section"}>{pendingAction === "create-section" ? "Creating…" : "Create section"}</button>
          </div>
        </form>
        {message ? <p className={`${styles.status} ${styles.error}`} role="alert">{message}</p> : null}
      </section>

      <section className={styles.panel} aria-labelledby="sections-heading">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Your sections</p>
            <h2 id="sections-heading" className={styles.title}>Lesson template pages</h2>
          </div>
          <span className={styles.sectionMeta}>{sections.length} {sections.length === 1 ? "section" : "sections"}</span>
        </div>
        {sections.length ? (
          <div className={styles.sectionGrid}>
            {sections.map((section) => (
              <Link key={section.id} href={`/cms/lesson-templates/${section.id}`} className={styles.sectionCard}>
                <div>
                  <p className={styles.eyebrow}>Lesson templates</p>
                  <h3>{section.title}</h3>
                  <p>{section.description || "No description yet."}</p>
                </div>
                <span className={styles.sectionMeta}>{section._count.items} {section._count.items === 1 ? "template" : "templates"} · Open section →</span>
              </Link>
            ))}
          </div>
        ) : <p className={styles.empty}>No sections yet. Create the first one above, then choose which lesson templates it should contain.</p>}
      </section>

      <section className={styles.panel} aria-labelledby="catalogue-heading">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Reusable catalogue</p>
            <h2 id="catalogue-heading" className={styles.title}>Choose templates to add</h2>
            <p className={styles.description}>A template can be placed in several sections without copying it. Creating a lesson from it still makes a fresh draft.</p>
          </div>
        </div>
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <article key={template.key} className={styles.templateCard}>
              <div>
                <span className={styles.templateMeta}>{template.lessonType} · {template.estimatedDuration} min</span>
                <h3>{template.title}</h3>
                <p>{template.description}</p>
                <div className={styles.tagList}>{template.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div>
              </div>
              <div className={styles.templateActions}>
                <select aria-label={`Section for ${template.title}`} className={styles.templateSelect} value={selectedSectionByTemplate[template.key] ?? ""} onChange={(event) => setSelectedSectionByTemplate((current) => ({ ...current, [template.key]: event.target.value }))} disabled={!sections.length}>
                  <option value="">{sections.length ? "Choose section" : "Create a section first"}</option>
                  {sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                </select>
                <button type="button" className={styles.button} disabled={!sections.length || pendingAction === template.key} onClick={() => void addTemplate(template.key)}>{pendingAction === template.key ? "Adding…" : "Add to section"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
