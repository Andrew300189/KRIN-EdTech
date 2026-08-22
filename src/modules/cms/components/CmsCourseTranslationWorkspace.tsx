"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./CmsCourseTranslationWorkspace.module.css";

type Localized = {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  phraseOfTheDay?: string | null;
  motivationalQuote?: string | null;
  previewText?: string | null;
  instruction?: string | null;
  question?: string | null;
  content?: unknown;
  explanation?: string | null;
  hint?: string | null;
  learningOutcomes?: unknown;
  prerequisites?: unknown;
  learningObjectives?: unknown;
};

type Exercise = { id: string; order: number; instruction: string; question: string; content: unknown; explanation: string | null; hint: string | null; translations: Localized[] };
type Block = { id: string; order: number; type: string; title: string | null; content: unknown; translations: Localized[]; exercises: Exercise[] };
type Lesson = { id: string; order: number; slug: string; title: string; description: string | null; phraseOfTheDay: string | null; motivationalQuote: string | null; previewText: string | null; learningObjectives: unknown; translations: Localized[]; blocks: Block[] };
type Module = { id: string; order: number; title: string; description: string | null; translations: Localized[]; lessons: Lesson[] };
type WorkspaceCourse = { id: string; title: string; slug: string; shortDescription: string; fullDescription: string | null; translations: Localized[]; modules: Module[] };

function translation<T extends Localized>(items: T[]) {
  return items[0] ?? null;
}

function text(value: string | null | undefined) {
  return value ?? "";
}

function jsonText(value: unknown) {
  return value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
}

function readJson(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? JSON.parse(raw) as unknown : null;
}

async function updateTranslation(courseId: string, locale: string, payload: unknown) {
  const response = await fetch(`/api/admin/cms/courses/${courseId}/translations?locale=${encodeURIComponent(locale)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Unable to save translation.");
}

export function CmsCourseTranslationWorkspace({ course, locale, localeLabel }: { course: WorkspaceCourse; locale: string; localeLabel: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(
    event: FormEvent<HTMLFormElement>,
    entityType: "COURSE" | "MODULE" | "LESSON" | "LESSON_BLOCK" | "EXERCISE",
    entityId: string,
    buildValues: (form: FormData) => Record<string, unknown>,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setMessage(null);
        await updateTranslation(course.id, locale, { entityType, entityId, values: buildValues(form) });
        setMessage("Translation saved as a draft. Publish the locale when its learner-facing copy is ready.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save translation.");
      }
    });
  }

  const courseTranslation = translation(course.translations);
  if (!courseTranslation) {
    return (
      <section className={styles.notice}>
        <h2>Create the {locale.toUpperCase()} draft first</h2>
        <p>The course does not have a writable translation draft yet. Return to the course editor and create it from the translations panel.</p>
      </section>
    );
  }

  return (
    <div className={styles.workspace}>
      {message ? <p className={styles.message} aria-live="polite">{message}</p> : null}

      <form
        onSubmit={(event) => save(event, "COURSE", course.id, (form) => ({
          slug: form.get("slug"),
          title: form.get("title"),
          shortDescription: form.get("shortDescription"),
          fullDescription: String(form.get("fullDescription") ?? "") || null,
          seoTitle: String(form.get("seoTitle") ?? "") || null,
          seoDescription: String(form.get("seoDescription") ?? "") || null,
          seoKeywords: String(form.get("seoKeywords") ?? "") || null,
          learningOutcomes: readJson(form.get("learningOutcomes")),
          prerequisites: readJson(form.get("prerequisites")),
        }))}
        className={`${styles.panel} ${styles.coursePanel}`}
      >
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>{locale.toUpperCase()} · {localeLabel}</p>
            <h2>Course presentation</h2>
            <p>This is the learner-facing copy. Operational course data remains on the base course.</p>
          </div>
          <button disabled={isPending} className={styles.primaryButton}>Save course copy</button>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>Title<input name="title" required defaultValue={text(courseTranslation.title)} /></label>
          <label className={styles.field}>Localized slug<input name="slug" required defaultValue={text(courseTranslation.slug)} /></label>
          <label className={`${styles.field} ${styles.fieldWide}`}>Short description<textarea name="shortDescription" required defaultValue={text(courseTranslation.shortDescription)} /></label>
          <label className={`${styles.field} ${styles.fieldWide}`}>Full description<textarea name="fullDescription" defaultValue={text(courseTranslation.fullDescription)} /></label>
        </div>

        <details className={styles.advanced}>
          <summary>SEO and structured course copy</summary>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>SEO title<input name="seoTitle" defaultValue={text(courseTranslation.seoTitle)} /></label>
            <label className={styles.field}>SEO keywords<input name="seoKeywords" defaultValue={text(courseTranslation.seoKeywords)} /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}>SEO description<textarea name="seoDescription" defaultValue={text(courseTranslation.seoDescription)} /></label>
            <label className={`${styles.field} ${styles.jsonField}`}>Learning outcomes (JSON array)<textarea name="learningOutcomes" defaultValue={jsonText(courseTranslation.learningOutcomes)} /></label>
            <label className={`${styles.field} ${styles.jsonField}`}>Prerequisites (JSON array)<textarea name="prerequisites" defaultValue={jsonText(courseTranslation.prerequisites)} /></label>
          </div>
        </details>
      </form>

      <section className={styles.contentHeader} aria-label="Course modules">
        <span>{course.modules.length} modules</span>
        <p>Open only the module, lesson or block you need to translate.</p>
      </section>

      <div className={styles.moduleList}>
        {course.modules.map((module) => {
          const moduleTranslation = translation(module.translations);
          return (
            <details key={module.id} className={styles.modulePanel}>
              <summary className={styles.moduleSummary}>
                <span className={styles.orderBadge}>{module.order}</span>
                <span className={styles.summaryCopy}>
                  <strong>{moduleTranslation?.title || module.title}</strong>
                  <small>{module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}</small>
                </span>
                <span className={styles.disclosure} aria-hidden="true" />
              </summary>

              <div className={styles.moduleBody}>
                <form onSubmit={(event) => save(event, "MODULE", module.id, (form) => ({ title: form.get("title"), description: String(form.get("description") ?? "") || null }))} className={styles.formPanel}>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>Translated module title<input name="title" required defaultValue={text(moduleTranslation?.title) || module.title} /></label>
                    <label className={styles.field}>Description<textarea name="description" defaultValue={text(moduleTranslation?.description) || text(module.description)} /></label>
                  </div>
                  <div className={styles.formActions}><button disabled={isPending} className={styles.secondaryButton}>Save module</button></div>
                </form>

                <div className={styles.lessonList}>
                  {module.lessons.map((lesson) => {
                    const lessonTranslation = translation(lesson.translations);
                    return (
                      <details key={lesson.id} className={styles.lessonPanel}>
                        <summary className={styles.lessonSummary}>
                          <span className={styles.lessonNumber}>Lesson {lesson.order}</span>
                          <span>{lessonTranslation?.title || lesson.title}</span>
                        </summary>

                        <form onSubmit={(event) => save(event, "LESSON", lesson.id, (form) => ({
                          slug: form.get("slug"),
                          title: form.get("title"),
                          description: String(form.get("description") ?? "") || null,
                          phraseOfTheDay: String(form.get("phraseOfTheDay") ?? "") || null,
                          motivationalQuote: String(form.get("motivationalQuote") ?? "") || null,
                          previewText: String(form.get("previewText") ?? "") || null,
                          learningObjectives: readJson(form.get("learningObjectives")),
                        }))} className={styles.formPanel}>
                          <div className={styles.fieldGrid}>
                            <label className={styles.field}>Title<input name="title" required defaultValue={text(lessonTranslation?.title) || lesson.title} /></label>
                            <label className={styles.field}>Slug<input name="slug" required defaultValue={text(lessonTranslation?.slug) || lesson.slug} /></label>
                            <label className={`${styles.field} ${styles.fieldWide}`}>Description<textarea name="description" defaultValue={text(lessonTranslation?.description) || text(lesson.description)} /></label>
                            <label className={styles.field}>Phrase of the day<input name="phraseOfTheDay" defaultValue={text(lessonTranslation?.phraseOfTheDay) || text(lesson.phraseOfTheDay)} /></label>
                            <label className={styles.field}>Preview text<input name="previewText" defaultValue={text(lessonTranslation?.previewText) || text(lesson.previewText)} /></label>
                            <label className={`${styles.field} ${styles.fieldWide}`}>Motivational quote<textarea name="motivationalQuote" defaultValue={text(lessonTranslation?.motivationalQuote) || text(lesson.motivationalQuote)} /></label>
                            <label className={`${styles.field} ${styles.fieldWide} ${styles.jsonField}`}>Learning objectives (JSON array)<textarea name="learningObjectives" defaultValue={jsonText(lessonTranslation?.learningObjectives ?? lesson.learningObjectives)} /></label>
                          </div>
                          <div className={styles.formActions}><button disabled={isPending} className={styles.secondaryButton}>Save lesson copy</button></div>
                        </form>

                        <div className={styles.blockList}>
                          {lesson.blocks.map((block) => {
                            const blockTranslation = translation(block.translations);
                            return (
                              <details key={block.id} className={styles.blockPanel}>
                                <summary className={styles.blockSummary}>
                                  <span>Block {block.order}</span>
                                  <span>{block.type}{block.title ? ` · ${block.title}` : ""}</span>
                                </summary>

                                <form onSubmit={(event) => save(event, "LESSON_BLOCK", block.id, (form) => ({ title: String(form.get("title") ?? "") || null, content: readJson(form.get("content")) }))} className={styles.formPanel}>
                                  <div className={styles.fieldGrid}>
                                    <label className={styles.field}>Title<input name="title" defaultValue={text(blockTranslation?.title) || text(block.title)} /></label>
                                    <label className={`${styles.field} ${styles.jsonField}`}>Block content (JSON)<textarea name="content" defaultValue={jsonText(blockTranslation?.content ?? block.content)} /></label>
                                  </div>
                                  <div className={styles.formActions}><button disabled={isPending} className={styles.secondaryButton}>Save block</button></div>
                                </form>

                                <div className={styles.exerciseList}>
                                  {block.exercises.map((exercise) => {
                                    const exerciseTranslation = translation(exercise.translations);
                                    return (
                                      <form key={exercise.id} onSubmit={(event) => save(event, "EXERCISE", exercise.id, (form) => ({
                                        instruction: form.get("instruction"),
                                        question: form.get("question"),
                                        content: readJson(form.get("content")),
                                        explanation: String(form.get("explanation") ?? "") || null,
                                        hint: String(form.get("hint") ?? "") || null,
                                      }))} className={styles.exercisePanel}>
                                        <div className={styles.exerciseHeader}>
                                          <span>Exercise {exercise.order}</span>
                                          <button disabled={isPending} className={styles.secondaryButton}>Save exercise</button>
                                        </div>
                                        <div className={styles.fieldGrid}>
                                          <label className={`${styles.field} ${styles.fieldWide}`}>Instruction<textarea name="instruction" required defaultValue={text(exerciseTranslation?.instruction) || exercise.instruction} /></label>
                                          <label className={`${styles.field} ${styles.fieldWide}`}>Question<textarea name="question" required defaultValue={text(exerciseTranslation?.question) || exercise.question} /></label>
                                          <label className={`${styles.field} ${styles.fieldWide} ${styles.jsonField}`}>Visible content (JSON)<textarea name="content" defaultValue={jsonText(exerciseTranslation?.content ?? exercise.content)} /></label>
                                          <label className={styles.field}>Explanation<textarea name="explanation" defaultValue={text(exerciseTranslation?.explanation) || text(exercise.explanation)} /></label>
                                          <label className={styles.field}>Hint<textarea name="hint" defaultValue={text(exerciseTranslation?.hint) || text(exercise.hint)} /></label>
                                        </div>
                                      </form>
                                    );
                                  })}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
