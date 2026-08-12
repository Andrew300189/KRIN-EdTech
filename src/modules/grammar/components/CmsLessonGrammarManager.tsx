"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Topic = { id: string; title: string; cefrLevel: string };
type LinkedTopic = { grammarTopicId: string; grammarTopic: Topic };

export function CmsLessonGrammarManager({ lessonId, initial, topics }: { lessonId: string; initial: LinkedTopic[]; topics: Topic[] }) {
  const router = useRouter();
  const [topicId, setTopicId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const linkedIds = new Set(initial.map((item) => item.grammarTopicId));
  const add = async () => { if (!topicId) return; setBusy(true); setError(""); try { const response = await fetch(`/api/admin/lessons/${lessonId}/grammar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grammarTopicId: topicId }) }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error ?? "Unable to link grammar topic."); setTopicId(""); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to link grammar topic."); } finally { setBusy(false); } };
  const remove = async (id: string) => { setBusy(true); setError(""); try { const response = await fetch(`/api/admin/lessons/${lessonId}/grammar/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("Unable to remove grammar topic."); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove grammar topic."); } finally { setBusy(false); } };
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">Lesson grammar</h2><p className="mt-1 text-sm text-slate-600">Link only the CEFR grammar topics explicitly taught or practised in this lesson.</p><div className="mt-4 flex flex-wrap gap-2"><select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={busy} className="min-w-60 rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Choose a grammar topic</option>{topics.filter((topic) => !linkedIds.has(topic.id)).map((topic) => <option key={topic.id} value={topic.id}>{topic.cefrLevel} · {topic.title}</option>)}</select><button type="button" onClick={() => void add()} disabled={!topicId || busy} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Link topic</button></div>{initial.length ? <ul className="mt-4 flex flex-wrap gap-2">{initial.map((item) => <li key={item.grammarTopicId} className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-sm text-violet-900"><span><strong>{item.grammarTopic.cefrLevel}</strong> · {item.grammarTopic.title}</span><button type="button" onClick={() => void remove(item.grammarTopicId)} disabled={busy} className="font-bold hover:text-red-700" aria-label={`Remove ${item.grammarTopic.title}`}>×</button></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No grammar topics linked yet.</p>}{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}</section>;
}
