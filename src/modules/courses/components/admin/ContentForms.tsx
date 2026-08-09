"use client";

import { FormEvent, useState } from "react";
import { EXERCISE_ENGINES, getDefaultExerciseSubtype, getExerciseDefinitions, type ExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";

type FormStatus = { message: string; isError: boolean } | null;

async function submitJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { error?: string; data?: { title?: string; lemma?: string } };
  if (!response.ok) throw new Error(payload.error ?? "Unable to save changes");
  return payload;
}

function Status({ status }: { status: FormStatus }) {
  return status ? <p className={`mt-3 text-sm ${status.isError ? "text-red-700" : "text-emerald-700"}`} role="status">{status.message}</p> : null;
}

export function AdminCourseForm({ levels, categories, initialLevelCode }: { levels: Array<{ code: string; title: string }>; categories: Array<{ slug: string; title: string }>; initialLevelCode?: string }) {
  const [status, setStatus] = useState<FormStatus>(null);
  const [saving, setSaving] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true); setStatus(null);
    try {
      const payload = await submitJson("/api/admin/courses", {
        title: data.get("title"), shortDescription: data.get("shortDescription"), levelCode: data.get("levelCode"), categorySlug: data.get("categorySlug"),
        estimatedDuration: Number(data.get("estimatedDuration") || 0), isPublished: data.get("isPublished") === "on",
        accessPlan: data.get("accessPlan"), firstFreeLessonCount: Number(data.get("firstFreeLessonCount") || 0),
      });
      event.currentTarget.reset();
      setStatus({ message: `Created ${payload.data?.title ?? "course"}. Refresh the list to continue editing it.`, isError: false });
    } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Unable to create course", isError: true }); }
    finally { setSaving(false); }
  }
  const selectedLevelCode = levels.some((level) => level.code === initialLevelCode) ? initialLevelCode : "A1";
  return <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"><h2 className="md:col-span-2 text-xl font-bold text-slate-900">Create course</h2><label className="md:col-span-2 text-sm font-medium">Title<input name="title" required minLength={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Short description<textarea name="shortDescription" required minLength={10} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">CEFR level<select name="levelCode" defaultValue={selectedLevelCode} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{levels.map((level) => <option key={level.code} value={level.code}>{level.code} — {level.title}</option>)}</select></label><label className="text-sm font-medium">Category<select name="categorySlug" defaultValue="general-english" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{categories.map((category) => <option key={category.slug} value={category.slug}>{category.title}</option>)}</select></label><label className="text-sm font-medium">Access<select name="accessPlan" defaultValue="FREE" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="FREE">Free</option><option value="PREMIUM">Premium</option><option value="CORPORATE">Corporate</option></select></label><label className="text-sm font-medium">Estimated minutes<input name="estimatedDuration" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Free lessons<input name="firstFreeLessonCount" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 flex items-center gap-2 text-sm font-medium"><input name="isPublished" type="checkbox" /> Publish immediately</label><div className="md:col-span-2"><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : "Create course"}</button><Status status={status} /></div></form>;
}

export function AdminModuleForm({ courseId }: { courseId: string }) {
  const [status, setStatus] = useState<FormStatus>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await submitJson(`/api/admin/courses/${courseId}/modules`, { title: data.get("title"), description: data.get("description") || undefined, isPublished: data.get("isPublished") === "on" }); event.currentTarget.reset(); setStatus({ message: "Module created. Refresh the page to add lessons.", isError: false }); } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Unable to create module", isError: true }); } }
  return <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Add module</h2><label className="mt-3 block text-sm font-medium">Title<input required name="title" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="mt-3 block text-sm font-medium">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="mt-3 flex items-center gap-2 text-sm font-medium"><input name="isPublished" type="checkbox" /> Publish module</label><button className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Add module</button><Status status={status} /></form>;
}

export function AdminLessonForm({ moduleId }: { moduleId: string }) {
  const [status, setStatus] = useState<FormStatus>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await submitJson(`/api/admin/modules/${moduleId}/lessons`, { title: data.get("title"), description: data.get("description") || undefined, type: data.get("type"), estimatedDuration: Number(data.get("estimatedDuration") || 0), isPublished: false, isFree: data.get("isFree") === "on", autoUnlockNextLesson: data.get("autoUnlockNextLesson") === "on", learningObjectives: [] }); event.currentTarget.reset(); setStatus({ message: "Draft lesson created. Open it to add prerequisites, blocks and publication settings.", isError: false }); } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Unable to create lesson", isError: true }); } }
  return <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-bold">Add lesson</h3><label className="mt-3 block text-sm font-medium">Title<input required name="title" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="mt-3 block text-sm font-medium">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Type<select name="type" defaultValue="THEORY" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["THEORY", "PRACTICE", "VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "TEST", "PROJECT", "MIXED"].map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-sm font-medium">Minutes<input name="estimatedDuration" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div><div className="mt-3 flex flex-wrap gap-5 text-sm font-medium"><label><input name="autoUnlockNextLesson" type="checkbox" defaultChecked className="mr-2" />Open next lesson after completion</label><label><input name="isFree" type="checkbox" className="mr-2" />Free lesson</label></div><button className="mt-4 rounded-lg border border-blue-700 px-4 py-2 font-semibold text-blue-700">Add draft lesson</button><Status status={status} /></form>;
}

export function AdminBlockForm({ lessonId }: { lessonId: string }) {
  const [status, setStatus] = useState<FormStatus>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { const content = String(data.get("content") || "").trim(); await submitJson(`/api/admin/lessons/${lessonId}/blocks`, { type: data.get("type"), title: data.get("title") || undefined, content: content ? JSON.parse(content) : undefined, isRequired: data.get("isRequired") === "on" }); event.currentTarget.reset(); setStatus({ message: "Block created. Refresh the page to add exercises.", isError: false }); } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Content must be valid JSON", isError: true }); } }
  return <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-bold">Add lesson block</h3><label className="mt-3 block text-sm font-medium">Type<select name="type" defaultValue="INTRO" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["INTRO", "LEARNING_OBJECTIVES", "WARM_UP", "THEORY", "GRAMMAR", "VOCABULARY", "READING", "LISTENING", "VIDEO", "DIALOGUE", "EXERCISE", "REVIEW", "HOMEWORK"].map((type) => <option key={type}>{type}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Title<input name="title" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="mt-3 block text-sm font-medium">Content JSON<textarea name="content" placeholder={'{"text":"Safe lesson content"}'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" /></label><label className="mt-3 flex items-center gap-2 text-sm font-medium"><input name="isRequired" type="checkbox" />Required before completing lesson</label><button className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Add block</button><Status status={status} /></form>;
}

export function AdminExerciseForm({ blockId }: { blockId: string }) {
  const [status, setStatus] = useState<FormStatus>(null);
  const [engineKey, setEngineKey] = useState<ExerciseEngineKey>(EXERCISE_ENGINES[0].key);
  const [subtype, setSubtype] = useState(getDefaultExerciseSubtype(EXERCISE_ENGINES[0].key) ?? "");
  const definitions = getExerciseDefinitions(engineKey);

  function changeEngine(nextEngineKey: ExerciseEngineKey) {
    setEngineKey(nextEngineKey);
    setSubtype(getDefaultExerciseSubtype(nextEngineKey) ?? "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const content = String(data.get("content") || "").trim();
      const answer = String(data.get("correctAnswer") || "").trim();
      await submitJson(`/api/admin/blocks/${blockId}/exercises`, {
        type: data.get("type"),
        engineKey,
        variantKey: subtype,
        instruction: data.get("instruction"),
        question: data.get("question"),
        content: content ? JSON.parse(content) : undefined,
        correctAnswer: JSON.parse(answer),
        explanation: data.get("explanation") || undefined,
        hint: data.get("hint") || undefined,
        hintsEnabled: data.get("hintsEnabled") === "on",
        basePoints: Number(data.get("basePoints") || 1),
      });
      event.currentTarget.reset();
      setStatus({ message: "Exercise created as a draft.", isError: false });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Exercise data must be valid JSON", isError: true });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <h4 className="font-bold text-slate-900">Add exercise</h4>
      <p className="mt-1 text-sm text-slate-600">Choose one universal engine and its methodical subtype; the lesson stores a configuration, not a separate component.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Legacy activity type<select name="type" defaultValue="SINGLE_CHOICE" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT_INPUT", "FILL_IN_THE_BLANK", "MATCHING", "WORD_ORDER", "SENTENCE_ORDER", "ERROR_CORRECTION", "SENTENCE_TRANSLATION", "LISTENING_QUESTIONS"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="text-sm font-medium">Universal engine<select value={engineKey} onChange={(event) => changeEngine(event.target.value as ExerciseEngineKey)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{EXERCISE_ENGINES.map((engine) => <option key={engine.key} value={engine.key}>{engine.engine} — {engine.title}</option>)}</select></label>
      </div>
      <label className="mt-3 block text-sm font-medium">Methodical subtype<select value={subtype} onChange={(event) => setSubtype(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{definitions.map((definition) => <option key={definition.subtype} value={definition.subtype}>{definition.subtype} — {definition.title}</option>)}</select></label>
      <label className="mt-3 block text-sm font-medium">Instruction<input required name="instruction" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="mt-3 block text-sm font-medium">Question<textarea required name="question" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="mt-3 block text-sm font-medium">Content JSON<textarea name="content" placeholder={'{"options":["a","b"]}'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" /></label>
      <label className="mt-3 block text-sm font-medium">Correct answer JSON<textarea required name="correctAnswer" placeholder={'"a"'} className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" /></label>
      <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Hint<textarea name="hint" className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Explanation<textarea name="explanation" className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm font-medium"><label>Points<input name="basePoints" type="number" min="0" max="1000" defaultValue="1" className="ml-2 w-20 rounded border border-slate-300 px-2 py-1" /></label><label><input name="hintsEnabled" type="checkbox" defaultChecked className="mr-2" />Hints enabled</label></div>
      <button className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Add draft exercise</button>
      <Status status={status} />
    </form>
  );
}

export function AdminWordForm() {
  const [status, setStatus] = useState<FormStatus>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await submitJson("/api/admin/words", { lemma: data.get("lemma"), partOfSpeech: data.get("partOfSpeech") || undefined, cefrLevel: data.get("cefrLevel") || undefined, meanings: [{ definition: data.get("definition"), translation: data.get("translation") || undefined }] }); event.currentTarget.reset(); setStatus({ message: "Word created. Refresh the list to see it.", isError: false }); } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Unable to create word", isError: true }); } }
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"><h2 className="md:col-span-2 text-xl font-bold">Add word</h2><label className="text-sm font-medium">Lemma<input required name="lemma" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Part of speech<input name="partOfSpeech" placeholder="noun, verb…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">CEFR level<select name="cefrLevel" defaultValue="A1" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="text-sm font-medium">Translation<input name="translation" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Definition<input required name="definition" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Add word</button><Status status={status} /></div></form>;
}

export function AdminGrammarForm() {
  const [status, setStatus] = useState<FormStatus>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await submitJson("/api/admin/grammar", { title: data.get("title"), cefrLevel: data.get("cefrLevel"), description: data.get("description") || undefined, order: Number(data.get("order") || 0) }); event.currentTarget.reset(); setStatus({ message: "Grammar topic created. Refresh the list to see it.", isError: false }); } catch (error) { setStatus({ message: error instanceof Error ? error.message : "Unable to create grammar topic", isError: true }); } }
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"><h2 className="md:col-span-2 text-xl font-bold">Add grammar topic</h2><label className="md:col-span-2 text-sm font-medium">Title<input required name="title" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">CEFR level<select name="cefrLevel" defaultValue="A1" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="text-sm font-medium">Display order<input name="order" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Add topic</button><Status status={status} /></div></form>;
}
