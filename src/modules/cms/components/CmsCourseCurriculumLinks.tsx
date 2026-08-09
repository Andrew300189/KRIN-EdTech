"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LinkValue = { nodeId: string; relation: "PRIMARY" | "RELATED"; node: { id: string; title: string; slug: string; type: string } };
type Node = { id: string; title: string; slug: string; type: string; parent: { title: string } | null; contentStatus: string };

export function CmsCourseCurriculumLinks({ courseId, levelCode, initialLinks }: { courseId: string; levelCode: string; initialLinks: LinkValue[] }) {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<LinkValue[]>(initialLinks);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/cms/curriculum?level=${encodeURIComponent(levelCode)}`)
      .then(async (response) => response.ok ? response.json() as Promise<{ data: Node[] }> : null)
      .then((payload) => { if (active && payload) setNodes(payload.data); });
    return () => { active = false; };
  }, [levelCode]);

  function setPrimary(nodeId: string) {
    setLinks((current) => [...current.filter((link) => link.nodeId !== nodeId && link.relation !== "PRIMARY"), { nodeId, relation: "PRIMARY", node: nodes.find((node) => node.id === nodeId) ?? { id: nodeId, title: "Curriculum item", slug: "", type: "" } }]);
  }

  function toggleRelated(nodeId: string) {
    setLinks((current) => current.some((link) => link.nodeId === nodeId)
      ? current.filter((link) => link.nodeId !== nodeId)
      : [...current, { nodeId, relation: "RELATED", node: nodes.find((node) => node.id === nodeId) ?? { id: nodeId, title: "Curriculum item", slug: "", type: "" } }]);
  }

  function save() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/courses/${courseId}/curriculum-links`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ links: links.map(({ nodeId, relation }) => ({ nodeId, relation })) }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) { setMessage(payload.error ?? "Unable to save course placement."); return; }
      setMessage(links.length ? "Course curriculum links saved." : "Course is available directly from its CEFR level.");
      router.refresh();
    });
  }

  const primary = links.find((link) => link.relation === "PRIMARY")?.nodeId ?? "";
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Curriculum placement</h2><p className="mt-2 text-sm text-slate-600">Leave every item unselected for a level-only course. Select one primary placement and any number of related topics or subtopics for discovery and search.</p><button type="button" onClick={() => setLinks([])} className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Level only</button>{nodes.length === 0 ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No sections, topics or subtopics exist for {levelCode} yet.</p> : <div className="mt-4 max-h-96 space-y-2 overflow-auto pr-1">{nodes.map((node) => { const linked = links.find((link) => link.nodeId === node.id); return <label key={node.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"><input type="checkbox" checked={Boolean(linked)} onChange={() => toggleRelated(node.id)} className="mt-1" /><span className="flex-1"><span className="block font-semibold text-slate-900">{node.title}</span><span className="block text-xs text-slate-500">{node.type}{node.parent ? ` · ${node.parent.title}` : ""} · {node.contentStatus}</span></span>{linked ? <input type="radio" name="primary-curriculum-node" checked={primary === node.id} onChange={() => setPrimary(node.id)} aria-label={`Set ${node.title} as primary placement`} /> : null}</label>; })}</div>}<div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{isPending ? "Saving…" : "Save placement"}</button>{message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}</div></section>;
}
