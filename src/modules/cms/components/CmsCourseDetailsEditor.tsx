"use client";

/* eslint-disable @next/next/no-img-element -- CMS previews accept author-supplied image URLs. */

import Link from "next/link";
import { ClipboardEvent, FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppModal } from "@/core/components/AppModal";
import { optimisePastedCourseCover } from "@/modules/cms/utils/course-cover.client";
import styles from "./CmsCourseDetailsEditor.module.css";

type Feedback = { message: string; error?: boolean } | null;
const openCourseEditorEvent = "cms:open-course-details-editor";

async function saveJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to save changes.");
}

type CourseEditorCourse = {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string | null;
  coverImage: string | null;
  duration: { minutes: number; lessonCount: number; exerciseCount: number };
  modules: Array<{ id: string; title: string; order: number; lessons: Array<{ id: string; title: string; order: number }> }>;
};

export function CmsCourseDetailsEditor({ course }: { course: CourseEditorCourse }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [coverImage, setCoverImage] = useState(course.coverImage ?? "");
  const [coverInput, setCoverInput] = useState(() => course.coverImage?.startsWith("data:image/") ? "" : course.coverImage ?? "");
  const [panel, setPanel] = useState<"details" | "content">("details");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [modules, setModules] = useState(course.modules);
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const openEditor = () => {
      const currentCover = course.coverImage ?? "";
      setCoverImage(currentCover);
      setCoverInput(currentCover.startsWith("data:image/") ? "" : currentCover);
      setFeedback(null);
      setPanel("details");
      setSelectedModuleId(null);
      setAddingModule(false);
      setAddingLessonToModuleId(null);
      setExpanded(true);
    };
    window.addEventListener(openCourseEditorEvent, openEditor);
    return () => window.removeEventListener(openCourseEditorEvent, openEditor);
  }, [course.coverImage]);

  useEffect(() => {
    setModules(course.modules);
  }, [course.modules]);

  async function handleCoverPaste(event: ClipboardEvent<HTMLInputElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      event.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      try {
        setCoverImage(await optimisePastedCourseCover(file));
        setCoverInput("");
        setFeedback(null);
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to use the copied image.", error: true });
      }
      return;
    }
    const html = event.clipboardData.getData("text/html");
    const source = html ? new DOMParser().parseFromString(html, "text/html").querySelector("img")?.src : null;
    if (source && /^https?:\/\//i.test(source)) {
      event.preventDefault();
      setCoverImage(source);
      setCoverInput(source);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        await saveJson(`/api/admin/courses/${course.id}`, {
          title: form.get("title"),
          shortDescription: form.get("shortDescription"),
          fullDescription: form.get("fullDescription"),
          coverImage: coverImage.trim() || null,
        });
        setExpanded(false);
        setFeedback({ message: "Course saved." });
        router.refresh();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to save course details.", error: true });
      }
    });
  }

  function createLesson(event: FormEvent<HTMLFormElement>, moduleId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        const response = await fetch(`/api/admin/modules/${moduleId}/lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("lessonTitle"),
            description: form.get("lessonDescription") || undefined,
            type: "MIXED",
            estimatedDuration: 0,
            learningObjectives: [],
            isPublished: false,
            isFree: false,
            autoUnlockNextLesson: true,
          }),
        });
        const payload = await response.json() as { data?: { id: string }; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to create the lesson.");
        setExpanded(false);
        router.push(`/cms/lessons/${payload.data.id}/blocks`);
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to create the lesson.", error: true });
      }
    });
  }

  function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        const response = await fetch(`/api/admin/courses/${course.id}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("moduleTitle"),
            description: form.get("moduleDescription") || undefined,
            isPublished: false,
          }),
        });
        const payload = await response.json() as { data?: { id: string; title: string; order: number }; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to create the module.");
        setModules((current) => [...current, { ...payload.data!, lessons: [] }].sort((left, right) => left.order - right.order));
        setAddingModule(false);
        setSelectedModuleId(payload.data.id);
        router.refresh();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to create the module.", error: true });
      }
    });
  }

  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? null;

  return <AppModal open={expanded} onOpenChange={setExpanded} title="Edit course" description="Update the learner-facing title, descriptions and course cover." size="large" unsavedChanges={false}>
    <div className={styles.modeTabs} role="tablist" aria-label="Course editor sections">
      <button type="button" role="tab" aria-selected={panel === "details"} className={panel === "details" ? styles.modeTabActive : styles.modeTab} onClick={() => setPanel("details")}>Details</button>
      <button type="button" role="tab" aria-selected={panel === "content"} className={panel === "content" ? styles.modeTabActive : styles.modeTab} onClick={() => { setPanel("content"); setAddingLessonToModuleId(null); }}>Content <span>{modules.length}</span></button>
    </div>
    {panel === "details" ? <form onSubmit={submit} className={styles.form}>
      <label className={styles.field}>Title<input name="title" required minLength={2} defaultValue={course.title} /></label>
      <label className={styles.field}>Short description<textarea name="shortDescription" required minLength={10} defaultValue={course.shortDescription} /></label>
      <label className={styles.field}>Full description<textarea name="fullDescription" defaultValue={course.fullDescription ?? ""} /></label>
      <section className={styles.coverSection} aria-label="Course cover image">
        <div className={styles.coverPreview}>{coverImage ? <img src={coverImage} alt="Course cover preview" /> : <span>No cover image</span>}</div>
        <label className={styles.field}>Cover image URL<input name="coverImage" type="url" value={coverInput} onChange={(event) => { setCoverInput(event.target.value); setCoverImage(event.target.value); }} onPaste={handleCoverPaste} placeholder={coverImage.startsWith("data:image/") ? "A pasted cover is ready. Paste a URL to replace it." : "Paste an image URL or copy an image"} /><small>Paste an image or image URL. The real image is previewed before you save; long image data is never shown here.</small>{coverImage ? <button type="button" className={styles.removeCover} onClick={() => { setCoverImage(""); setCoverInput(""); }}>Remove cover</button> : null}</label>
      </section>
      <aside className={styles.duration} aria-label="Automatic duration">
        <span>Automatic course duration</span><strong>{course.duration.minutes > 0 ? `${course.duration.minutes} min` : "Waiting for course content"}</strong><p>{course.duration.lessonCount} lessons · {course.duration.exerciseCount} exercises. Duration is recalculated from blocks, exercise engine, difficulty and time limits.</p>
      </aside>
      <div className={styles.actions}><button disabled={isPending} className={styles.save}>{isPending ? "Saving..." : "Save changes"}</button><button type="button" disabled={isPending} onClick={() => setExpanded(false)} className={styles.cancel}>Cancel</button></div>
      {feedback ? <p role="status" className={feedback.error ? styles.error : styles.success}>{feedback.message}</p> : null}
    </form> : <section className={styles.contentPanel} aria-label="Course content">
      {!selectedModule ? <div className={styles.moduleCreation}><button type="button" className={styles.addModuleButton} onClick={() => setAddingModule((value) => !value)}>Add module</button>{addingModule ? <form onSubmit={createModule} className={styles.addLessonForm}><label className={styles.field}>Module title<input name="moduleTitle" required minLength={2} autoFocus /></label><label className={styles.field}>Optional description<textarea name="moduleDescription" /></label><div className={styles.actions}><button className={styles.save} disabled={isPending}>{isPending ? "Adding..." : "Create module"}</button><button type="button" className={styles.cancel} disabled={isPending} onClick={() => setAddingModule(false)}>Cancel</button></div></form> : null}</div> : null}
      {selectedModule ? <>
        <div className={styles.contentHeader}><button type="button" className={styles.backToModules} onClick={() => { setSelectedModuleId(null); setAddingLessonToModuleId(null); }}>← Modules</button><p>Module {selectedModule.order}</p><h3>{selectedModule.title}</h3></div>
        {selectedModule.lessons.length ? <ol className={styles.lessonList}>{selectedModule.lessons.map((lesson) => <li key={lesson.id}><Link href={`/cms/lessons/${lesson.id}/blocks`} className={styles.lessonLink}><span>{lesson.order}</span>{lesson.title}<small>Open lesson engine →</small></Link></li>)}</ol> : <div className={styles.emptyLessons}><p>This module has no lessons yet.</p>{addingLessonToModuleId === selectedModule.id ? <form onSubmit={(event) => createLesson(event, selectedModule.id)} className={styles.addLessonForm}><label className={styles.field}>Lesson title<input name="lessonTitle" required minLength={2} defaultValue={`Lesson ${selectedModule.order}.1`} autoFocus /></label><label className={styles.field}>Optional description<textarea name="lessonDescription" /></label><div className={styles.actions}><button className={styles.save} disabled={isPending}>{isPending ? "Opening engine..." : "Create and open lesson engine"}</button><button type="button" className={styles.cancel} disabled={isPending} onClick={() => setAddingLessonToModuleId(null)}>Cancel</button></div></form> : <button type="button" className={styles.save} onClick={() => setAddingLessonToModuleId(selectedModule.id)}>Add lesson</button>}</div>}
      </> : <><p className={styles.contentIntro}>Choose a module to see its lesson outline. A lesson title opens the existing step-by-step lesson engine.</p>{course.modules.length ? <div className={styles.moduleList}>{course.modules.map((module) => <button key={module.id} type="button" className={styles.moduleButton} onClick={() => setSelectedModuleId(module.id)}><span>Module {module.order}</span><strong>{module.title}</strong><small>{module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"} →</small></button>)}</div> : <div className={styles.emptyLessons}>No modules have been added to this course yet.</div>}</>}
      {feedback ? <p role="status" className={feedback.error ? styles.error : styles.success}>{feedback.message}</p> : null}
    </section>}
  </AppModal>;
}

/** Header-level trigger for the course editor modal. */
export function CmsCourseDetailsEditTrigger({ className }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(openCourseEditorEvent))}>Edit course</button>;
}

export function CmsModuleDetailsEditor({ module, availableModules }: {
  module: { id: string; title: string; description: string | null; isRequired: boolean; requiresSequentialCompletion: boolean; unlockAfterModuleId: string | null; requiredCompletionPercent: number };
  availableModules: Array<{ id: string; title: string; order: number }>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      try {
        await saveJson(`/api/admin/modules/${module.id}`, {
          title: form.get("title"),
          description: form.get("description"),
          isRequired: form.get("isRequired") === "on",
          requiresSequentialCompletion: form.get("requiresSequentialCompletion") === "on",
          unlockAfterModuleId: String(form.get("unlockAfterModuleId") || "") || null,
          requiredCompletionPercent: Number(form.get("requiredCompletionPercent") || 100),
        });
        setExpanded(false);
        setFeedback({ message: "Module saved." });
        router.refresh();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to save module.", error: true });
      }
    });
  }

  return <div className="mt-3">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50" aria-expanded={expanded}>{expanded ? "Close module editor" : "Edit module"}</button>
    {expanded ? <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 md:grid-cols-2">
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Module title<input name="title" required minLength={2} defaultValue={module.title} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" defaultValue={module.description ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isRequired" type="checkbox" defaultChecked={module.isRequired} />Required module</label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="requiresSequentialCompletion" type="checkbox" defaultChecked={module.requiresSequentialCompletion} />Require previous module completion</label>
      <label className="text-sm font-medium text-slate-700">Unlock after module<select name="unlockAfterModuleId" defaultValue={module.unlockAfterModuleId ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">No explicit prerequisite</option>{availableModules.filter((item) => item.id !== module.id).map((item) => <option key={item.id} value={item.id}>{item.order}. {item.title}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Required prerequisite completion (%)<input name="requiredCompletionPercent" type="number" min="1" max="100" defaultValue={module.requiredCompletionPercent} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <p className="md:col-span-2 text-xs text-slate-600">The completion percentage is checked against every selected prerequisite. Explicit prerequisites must remain before this module.</p>
      <button disabled={isPending} className="w-fit rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving..." : "Save module"}</button>
    </form> : null}
    {feedback ? <p role="status" className={`mt-2 text-xs ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}
  </div>;
}
