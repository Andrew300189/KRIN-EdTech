"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

type NodeType = "SECTION" | "TOPIC" | "SUBTOPIC";
type Translation = { id: string; locale: string; title: string; description: string | null; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null };
type Node = {
  id: string; type: NodeType; slug: string; title: string; description: string | null; locale: string; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; showOnHomepage: boolean; showInSearch: boolean; order: number; contentStatus: string;
  level: { code: string; title: string }; parent: { id: string; title: string; slug: string; type: NodeType } | null;
  _count: { children: number; courseLinks: number };
  courseLinks: Array<{ id: string; relation: "PRIMARY" | "RELATED"; course: { id: string; title: string; slug: string; contentStatus: string } }>;
  translations: Translation[];
};
type ParentOption = { id: string; title: string; slug: string; level: { code: string } };

const labels: Record<NodeType, string> = { SECTION: "Sections", TOPIC: "Topics", SUBTOPIC: "Subtopics" };
const parentLabels: Record<NodeType, string | null> = { SECTION: null, TOPIC: "section", SUBTOPIC: "topic" };
const lifecycleActions = ["PUBLISH", "UNPUBLISH", "ARCHIVE", "RESTORE"] as const;

function nodeParentLabel(type: NodeType) { return parentLabels[type]; }

export function CmsCurriculumWorkspace({ type, levels, initialNodes, parentOptions }: { type: NodeType; levels: Array<{ code: string; title: string }>; initialNodes: Node[]; parentOptions: ParentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState(initialNodes);
  const [formLevel, setFormLevel] = useState(levels[0]?.code ?? "A1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const query = searchParams.get("q") ?? "";
  const levelFilter = searchParams.get("level") ?? "ALL";

  useEffect(() => setNodes(initialNodes), [initialNodes]);
  const visible = useMemo(() => nodes.filter((node) => {
    const search = query.trim().toLowerCase();
    return (!search || `${node.title} ${node.slug} ${node.parent?.title ?? ""}`.toLowerCase().includes(search)) && (levelFilter === "ALL" || node.level.code === levelFilter);
  }), [nodes, levelFilter, query]);

  function setFilter(key: "q" | "level", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") next.delete(key); else next.set(key, value);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function request(url: string, method: "POST" | "PATCH" | "PUT", body: unknown) {
    return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (response) => {
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "CMS request failed.");
      return payload;
    });
  }

  function createNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try {
      await request("/api/admin/cms/curriculum", "POST", { levelCode: form.get("levelCode"), parentId: form.get("parentId") || undefined, type, slug: form.get("slug"), title: form.get("title"), description: form.get("description") || undefined, locale: form.get("locale") || "en" });
      event.currentTarget.reset(); setMessage(`${labels[type].slice(0, -1)} created as a draft.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create curriculum item."); } });
  }

  function saveNode(event: FormEvent<HTMLFormElement>, node: Node) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try {
      await request(`/api/admin/cms/curriculum/${node.id}`, "PATCH", { title: form.get("title"), slug: form.get("slug"), description: form.get("description"), locale: form.get("locale"), seoTitle: form.get("seoTitle"), seoDescription: form.get("seoDescription"), seoKeywords: form.get("seoKeywords"), showOnHomepage: form.get("showOnHomepage") === "on", showInSearch: form.get("showInSearch") === "on" });
      setEditingId(null); setMessage(`${node.title} saved.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save curriculum item."); } });
  }

  function moveNode(event: FormEvent<HTMLFormElement>, node: Node) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try { await request(`/api/admin/cms/curriculum/${node.id}/move`, "POST", { parentId: form.get("parentId") || null }); setMessage("Item moved. Linked course and route safety were checked."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to move item."); } });
  }

  function duplicateNode(event: FormEvent<HTMLFormElement>, node: Node) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try { await request(`/api/admin/cms/curriculum/${node.id}/duplicate`, "POST", { targetLevelCode: form.get("targetLevelCode"), targetParentId: form.get("targetParentId") || null }); setMessage("Copied as a draft. Course links were intentionally not copied across levels."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to copy item."); } });
  }

  function saveTranslation(event: FormEvent<HTMLFormElement>, node: Node) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try { await request(`/api/admin/cms/curriculum/${node.id}/translations`, "PUT", { locale: form.get("translationLocale"), title: form.get("translationTitle"), description: form.get("translationDescription") || undefined, seoTitle: form.get("translationSeoTitle") || undefined, seoDescription: form.get("translationSeoDescription") || undefined, seoKeywords: form.get("translationSeoKeywords") || undefined }); setMessage("Localized content saved."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save localization."); } });
  }

  function bulk(action: (typeof lifecycleActions)[number]) {
    if (!selectedIds.size) return;
    startTransition(async () => { try { await request("/api/admin/cms/content/bulk", "PATCH", { entityType: "CURRICULUM_NODE", entityIds: [...selectedIds], action }); setMessage(`${action.toLowerCase()} completed for selected curriculum items.`); setSelectedIds(new Set()); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update selected items."); } });
  }

  function toggleSelection(id: string) { setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  function dropOn(event: DragEvent<HTMLElement>, target: Node) {
    event.preventDefault(); const source = nodes.find((node) => node.id === draggedId); setDraggedId(null);
    if (!source || source.id === target.id) return;
    if (source.type !== target.type || source.level.code !== target.level.code || source.parent?.id !== target.parent?.id) { setMessage("Drag-and-drop only reorders siblings. Use Move to change a parent."); return; }
    const siblings = nodes.filter((node) => node.type === source.type && node.level.code === source.level.code && node.parent?.id === source.parent?.id).sort((left, right) => left.order - right.order);
    const sourceIndex = siblings.findIndex((node) => node.id === source.id); const targetIndex = siblings.findIndex((node) => node.id === target.id);
    const reordered = [...siblings]; reordered.splice(sourceIndex, 1); reordered.splice(targetIndex, 0, source);
    const orderedIds = reordered.map((node) => node.id);
    startTransition(async () => { try { await request("/api/admin/cms/content/CURRICULUM_NODE/reorder", "PUT", { orderedIds }); setNodes((current) => current.map((node) => { const order = orderedIds.indexOf(node.id); return order >= 0 ? { ...node, order: order + 1 } : node; })); setMessage("Sibling order saved."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to reorder items."); } });
  }

  const availableParents = parentOptions.filter((parent) => parent.level.code === formLevel);
  const parentLabel = nodeParentLabel(type);
  return <section className="space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Curriculum tree</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{labels[type]}</h1><p className="mt-2 max-w-3xl text-slate-600">Create, localize, publish and safely organize level-specific content. Drag items to reorder siblings; parent changes use the checked Move workflow.</p></header>
    <form onSubmit={createNode} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2"><h2 className="text-lg font-bold text-slate-950 md:col-span-2">Create {type.toLowerCase()}</h2><label className="text-sm font-medium text-slate-700">Level<select name="levelCode" value={formLevel} onChange={(event) => setFormLevel(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{levels.map((level) => <option key={level.code} value={level.code}>{level.code} — {level.title}</option>)}</select></label>{parentLabel ? <label className="text-sm font-medium text-slate-700">Parent {parentLabel}<select name="parentId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Choose a {parentLabel}</option>{availableParents.map((parent) => <option key={parent.id} value={parent.id}>{parent.title}</option>)}</select></label> : <div />}<label className="text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Slug<input name="slug" required pattern="[a-z0-9]+([.-][a-z0-9]+)*" placeholder="personal-pronouns" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Base locale<input name="locale" defaultValue="en" pattern="[a-z]{2}(-[A-Z]{2})?" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea name="description" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><button type="submit" disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{isPending ? "Saving…" : "Create draft"}</button></div></form>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Search<input value={query} onChange={(event) => setFilter("q", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder={`Search ${type.toLowerCase()}s`} /></label><label className="text-sm font-medium text-slate-700">Level<select value={levelFilter} onChange={(event) => setFilter("level", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ALL">All levels</option>{levels.map((level) => <option key={level.code} value={level.code}>{level.code}</option>)}</select></label></div>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="mr-2 text-sm font-semibold text-slate-700">{selectedIds.size} selected</span>{lifecycleActions.map((action) => <button key={action} type="button" disabled={isPending || selectedIds.size === 0} onClick={() => bulk(action)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">{action.toLowerCase()}</button>)}<button type="button" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs font-semibold text-slate-600 hover:text-slate-950">Clear selection</button></div>
    {message ? <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No {type.toLowerCase()}s match the selected filters.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((node) => { const edit = editingId === node.id; return <article key={node.id} draggable onDragStart={() => setDraggedId(node.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn(event, node)} className={`rounded-2xl border bg-white p-5 ${draggedId === node.id ? "border-blue-500 opacity-60" : "border-slate-200"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={selectedIds.has(node.id)} onChange={() => toggleSelection(node.id)} aria-label={`Select ${node.title}`} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-blue-700">{node.level.code}{node.parent ? ` · ${node.parent.title}` : ""}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{node.title}</h2><p className="mt-1 font-mono text-xs text-slate-500">{node.slug} · {node.locale}</p></div><CmsLifecycleControls entityType="CURRICULUM_NODE" entityId={node.id} status={node.contentStatus} compact /></div><p className="mt-3 text-sm text-slate-600">{node.description ?? "No description."}</p><p className="mt-3 text-xs text-slate-500">{node._count.children} children · {node._count.courseLinks} linked courses · order {node.order}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingId(edit ? null : node.id)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">{edit ? "Close" : "Edit"}</button><Link href={`/cms/preview/curriculum/${node.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Preview</Link><Link href={`/cms/revisions?entityType=CURRICULUM_NODE&entityId=${node.id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">History</Link></div>{node.courseLinks.length ? <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Linked courses</p>{node.courseLinks.map((link) => <Link key={link.id} href={`/cms/courses/${link.course.id}`} className="mt-1 block text-blue-700 hover:underline">{link.relation.toLowerCase()} · {link.course.title}</Link>)}</div> : <Link href={`/cms/courses?level=${node.level.code}`} className="mt-3 inline-block text-xs font-semibold text-blue-700 hover:underline">Link a course in the course editor</Link>}{edit ? <div className="mt-4 space-y-3 border-t border-slate-200 pt-4"><form onSubmit={(event) => saveNode(event, node)} className="grid gap-3 rounded-xl bg-blue-50 p-3"><label className="text-sm font-medium">Title<input name="title" defaultValue={node.title} required className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5" /></label><label className="text-sm font-medium">Slug<input name="slug" defaultValue={node.slug} required className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5" /></label><label className="text-sm font-medium">Description<textarea name="description" defaultValue={node.description ?? ""} className="mt-1 min-h-16 w-full rounded border border-slate-300 bg-white px-2 py-1.5" /></label><label className="text-sm font-medium">Base locale<input name="locale" defaultValue={node.locale} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5" /></label><details className="rounded border border-blue-100 bg-white p-2"><summary className="cursor-pointer text-sm font-semibold">SEO and visibility</summary><div className="mt-2 grid gap-2"><input name="seoTitle" defaultValue={node.seoTitle ?? ""} placeholder="SEO title" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><textarea name="seoDescription" defaultValue={node.seoDescription ?? ""} placeholder="SEO description" className="min-h-16 rounded border border-slate-300 px-2 py-1.5 text-sm" /><input name="seoKeywords" defaultValue={node.seoKeywords ?? ""} placeholder="SEO keywords" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><label className="text-sm"><input name="showOnHomepage" type="checkbox" defaultChecked={node.showOnHomepage} className="mr-2" />Show on homepage</label><label className="text-sm"><input name="showInSearch" type="checkbox" defaultChecked={node.showInSearch} className="mr-2" />Include in search</label></div></details><button disabled={isPending} className="w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save changes</button></form>{parentLabel ? <form onSubmit={(event) => moveNode(event, node)} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-bold">Move within {node.level.code}</p><label className="mt-2 block text-sm">New parent<select name="parentId" defaultValue={node.parent?.id ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5">{parentOptions.filter((parent) => parent.level.code === node.level.code).map((parent) => <option key={parent.id} value={parent.id}>{parent.title}</option>)}</select></label><button disabled={isPending} className="mt-2 rounded border border-amber-400 px-3 py-1.5 text-sm font-semibold">Move safely</button></form> : null}<form onSubmit={(event) => duplicateNode(event, node)} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-bold">Copy to another level</p><label className="mt-2 block text-sm">Target level<select name="targetLevelCode" defaultValue={node.level.code} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5">{levels.map((level) => <option key={level.code} value={level.code}>{level.code}</option>)}</select></label>{parentLabel ? <label className="mt-2 block text-sm">Target parent<select name="targetParentId" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"><option value="">Choose target {parentLabel}</option>{parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.level.code} · {parent.title}</option>)}</select></label> : null}<button disabled={isPending} className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold">Copy as draft</button></form><form onSubmit={(event) => saveTranslation(event, node)} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-bold">Localization</p><p className="mt-1 text-xs text-slate-500">Saved translations: {node.translations.map((translation) => translation.locale).join(", ") || "none"}</p><div className="mt-2 grid gap-2"><input name="translationLocale" required pattern="[a-z]{2}(-[A-Z]{2})?" placeholder="uk" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><input name="translationTitle" required placeholder="Localized title" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><textarea name="translationDescription" placeholder="Localized description" className="min-h-16 rounded border border-slate-300 px-2 py-1.5 text-sm" /><input name="translationSeoTitle" placeholder="Localized SEO title" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /><textarea name="translationSeoDescription" placeholder="Localized SEO description" className="min-h-16 rounded border border-slate-300 px-2 py-1.5 text-sm" /><input name="translationSeoKeywords" placeholder="Localized SEO keywords" className="rounded border border-slate-300 px-2 py-1.5 text-sm" /></div><button disabled={isPending} className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold">Save localization</button></form></div> : null}</div></div></article>; })}</div>}
  </section>;
}
