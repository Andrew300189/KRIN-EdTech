"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const lessonTypes = ["THEORY", "PRACTICE", "VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "TEST", "PROJECT", "MIXED"] as const;

type Lesson = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  estimatedDuration: number;
  previewText: string | null;
  phraseOfTheDay: string | null;
  motivationalQuote: string | null;
  prerequisiteLessonId: string | null;
  requiredPrerequisiteCompletion: number;
  autoUnlockNextLesson: boolean;
  isFree: boolean;
  order: number;
};

type AvailableLesson = { id: string; title: string; order: number };
type Feedback = { message: string; error?: boolean } | null;

async function request(url: string, method: "PATCH" | "POST", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Unable to save lesson.");
}

export function CmsLessonDetailsEditor({ lesson, availableLessons }: { lesson: Lesson; availableLessons: AvailableLesson[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const prerequisites = availableLessons.filter((item) => item.id !== lesson.id && item.order < lesson.order);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await request(`/api/admin/lessons/${lesson.id}`, "PATCH", {
          title: form.get("title"),
          slug: form.get("slug"),
          description: form.get("description") || undefined,
          type: form.get("type"),
          estimatedDuration: Number(form.get("estimatedDuration") || 0),
          previewText: form.get("previewText") || undefined,
          phraseOfTheDay: form.get("phraseOfTheDay") || undefined,
          motivationalQuote: form.get("motivationalQuote") || undefined,
          prerequisiteLessonId: form.get("prerequisiteLessonId") || null,
          requiredPrerequisiteCompletion: Number(form.get("requiredPrerequisiteCompletion") || 100),
          autoUnlockNextLesson: form.get("autoUnlockNextLesson") === "on",
          isFree: form.get("isFree") === "on",
        });
        setFeedback({ message: "Lesson settings saved." });
        router.refresh();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to save lesson.", error: true });
      }
    });
  }

  return <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-bold text-slate-950">Lesson settings</h2><p className="mt-1 text-sm text-slate-600">Prerequisites and automatic continuation are checked on the server for every learner.</p></div><label className="md:col-span-2 text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} defaultValue={lesson.title} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Slug<input name="slug" required defaultValue={lesson.slug} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Type<select name="type" defaultValue={lesson.type} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{lessonTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="md:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" defaultValue={lesson.description ?? ""} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Estimated minutes<input name="estimatedDuration" type="number" min="0" max="10000" defaultValue={lesson.estimatedDuration} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Lesson prerequisite<select name="prerequisiteLessonId" defaultValue={lesson.prerequisiteLessonId ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">No prerequisite</option>{prerequisites.map((item) => <option key={item.id} value={item.id}>{item.order}. {item.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Required prerequisite completion (%)<input name="requiredPrerequisiteCompletion" type="number" min="1" max="100" defaultValue={lesson.requiredPrerequisiteCompletion} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-700"><label className="flex items-center gap-2"><input name="autoUnlockNextLesson" type="checkbox" defaultChecked={lesson.autoUnlockNextLesson} />Open the next lesson after completion</label><label className="flex items-center gap-2"><input name="isFree" type="checkbox" defaultChecked={lesson.isFree} />Free lesson</label></div><label className="md:col-span-2 text-sm font-medium text-slate-700">Preview text<textarea name="previewText" defaultValue={lesson.previewText ?? ""} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Phrase of the day<input name="phraseOfTheDay" defaultValue={lesson.phraseOfTheDay ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Motivational quote<input name="motivationalQuote" defaultValue={lesson.motivationalQuote ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2 flex items-center gap-3"><button disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : "Save lesson"}</button>{feedback ? <p role="status" className={`text-sm ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}</div></form>;
}

export function CmsLessonEnhancements({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function createBlock(event: FormEvent<HTMLFormElement>, type: "GRAMMAR" | "HOMEWORK" | "VIDEO") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("content") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    startTransition(async () => {
      try {
        if (type === "VIDEO" && !/^https?:\/\//i.test(url)) throw new Error("Enter a valid HTTP(S) video URL.");
        if (type !== "VIDEO" && text.length < 2) throw new Error("Add the lesson content first.");
        await request(`/api/admin/lessons/${lessonId}/blocks`, "POST", {
          type,
          title: type === "GRAMMAR" ? "Mini grammar" : type === "HOMEWORK" ? "Homework" : "Previous homework review",
          content: type === "VIDEO" ? { url } : { text },
          isRequired: type === "HOMEWORK",
        });
        event.currentTarget.reset();
        setFeedback({ message: `${type === "HOMEWORK" ? "Homework" : type === "GRAMMAR" ? "Mini grammar" : "Video review"} block added as a draft.` });
        router.refresh();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Unable to add lesson material.", error: true });
      }
    });
  }

  return <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5"><h2 className="text-xl font-bold text-slate-950">Lesson additions</h2><p className="mt-1 text-sm text-slate-600">These create canonical draft blocks — no duplicate content store is introduced.</p><div className="mt-4 grid gap-4 lg:grid-cols-3"><form onSubmit={(event) => createBlock(event, "GRAMMAR")} className="rounded-xl border border-blue-100 bg-white p-4"><h3 className="font-semibold text-slate-900">Mini grammar</h3><textarea name="content" required minLength={2} placeholder="Rule, example and note…" className="mt-3 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button disabled={isPending} className="mt-3 rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Add mini grammar</button></form><form onSubmit={(event) => createBlock(event, "HOMEWORK")} className="rounded-xl border border-blue-100 bg-white p-4"><h3 className="font-semibold text-slate-900">Homework assignment</h3><textarea name="content" required minLength={2} placeholder="Instructions for the learner…" className="mt-3 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button disabled={isPending} className="mt-3 rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Assign homework</button></form><form onSubmit={(event) => createBlock(event, "VIDEO")} className="rounded-xl border border-blue-100 bg-white p-4"><h3 className="font-semibold text-slate-900">Previous homework review</h3><input name="url" type="url" required placeholder="https://…" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button disabled={isPending} className="mt-3 rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Add video review</button></form></div>{feedback ? <p role="status" className={`mt-3 text-sm ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}>{feedback.message}</p> : null}</section>;
}
