"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Level = { code: string; title: string };
type Node = { id: string; title: string; type: string; parent: { title: string } | null };

export function CmsCourseAdvancedOperations({ courseId, currentLevelCode, levels }: { courseId: string; currentLevelCode: string; levels: Level[] }) {
  const router = useRouter();
  const [targetLevel, setTargetLevel] = useState(currentLevelCode);
  const [primaryNodeId, setPrimaryNodeId] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setPrimaryNodeId("");
    void fetch(`/api/admin/cms/curriculum?level=${encodeURIComponent(targetLevel)}`)
      .then(async (response) => response.ok ? response.json() as Promise<{ data: Node[] }> : null)
      .then((payload) => { if (active) setNodes(payload?.data ?? []); });
    return () => { active = false; };
  }, [targetLevel]);

  function request(path: string, init: RequestInit, success: string) {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(path, init);
        const payload = await response.json() as { error?: string; data?: { id?: string } };
        if (!response.ok) throw new Error(payload.error ?? "Unable to update course.");
        setMessage(success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update course.");
      }
    });
  }

  function saveTemplate() {
    request(`/api/admin/cms/courses/${courseId}/template`, { method: "POST" }, "Template created as a private draft.");
  }

  function duplicate() {
    request(`/api/admin/cms/content/COURSE/${courseId}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetLevelCode: targetLevel }) }, "Course clone created as a draft.");
  }

  function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request(`/api/admin/cms/courses/${courseId}/move`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelCode: targetLevel, primaryNodeId: primaryNodeId || null }) }, "Course placement updated safely.");
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-bold text-slate-950">Advanced course operations</h2>
    <p className="mt-1 text-sm text-slate-600">Clones receive new IDs and slugs. Templates and clones exclude student progress, purchases, assignments and enrolments.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={isPending} onClick={saveTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Save as template</button><button type="button" disabled={isPending} onClick={duplicate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">Clone course</button></div>
    <form onSubmit={move} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3 md:items-end"><label className="text-sm font-medium text-slate-700">Move to level<select value={targetLevel} onChange={(event) => setTargetLevel(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">{levels.map((level) => <option key={level.code} value={level.code}>{level.code} · {level.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Primary topic / subtopic<select value={primaryNodeId} onChange={(event) => setPrimaryNodeId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"><option value="">Level only (clear placement)</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.type} · {node.parent ? `${node.parent.title} · ` : ""}{node.title}</option>)}</select></label><button type="submit" disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Move course</button></form>
    {message ? <p role="status" className="mt-3 text-sm text-slate-700">{message}</p> : null}
  </section>;
}
