"use client";

import { useMemo, useState } from "react";
import { diffRevisionSnapshots } from "@/modules/cms/utils/revision-diff";

type Revision = {
  id: string;
  version: number;
  action: string;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
  snapshot: unknown;
};

function display(value: unknown) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function CmsCourseRevisionComparison({ revisions }: { revisions: Revision[] }) {
  const [fromId, setFromId] = useState(revisions[1]?.id ?? revisions[0]?.id ?? "");
  const [toId, setToId] = useState(revisions[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);
  const [from, to] = [revisions.find((item) => item.id === fromId), revisions.find((item) => item.id === toId)];
  const differences = useMemo(() => from && to ? diffRevisionSnapshots(from.snapshot, to.snapshot) : [], [from, to]);

  if (!revisions.length) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Version comparison</h2><p className="mt-2 text-sm text-slate-600">The first editorial change will create a comparison point here.</p></section>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Version comparison</h2><p className="mt-1 text-sm text-slate-600">Compare immutable course revisions before restoring or publishing content.</p></div><button type="button" onClick={() => setExpanded((value) => !value)} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">{expanded ? "Hide comparison" : "Compare versions"}</button></div>
    {expanded ? <div className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">From<select value={fromId} onChange={(event) => setFromId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">{revisions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {item.action} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label><label className="text-sm font-medium text-slate-700">To<select value={toId} onChange={(event) => setToId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">{revisions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {item.action} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label></div>{from && to && from.id === to.id ? <p className="text-sm text-slate-600">Choose two different revisions.</p> : differences.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Earlier</th><th className="px-3 py-2">Later</th></tr></thead><tbody>{differences.map((difference) => <tr key={difference.path} className="border-t border-slate-100 align-top"><td className="px-3 py-2 font-mono text-xs text-slate-700">{difference.path}</td><td className="max-w-xs break-words px-3 py-2 text-slate-600">{display(difference.before)}</td><td className="max-w-xs break-words px-3 py-2 text-slate-900">{display(difference.after)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-600">These revisions contain the same saved fields.</p>}</div> : null}
  </section>;
}
