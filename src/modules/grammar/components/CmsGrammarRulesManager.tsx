"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";

type Rule = { id: string; title: string; explanation: string; examples: unknown; order: number };

const asLines = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string").join("\n")
  : "";
const readLines = (value: FormDataEntryValue | null) => String(value ?? "").split("\n").map((line) => line.trim()).filter(Boolean);

export function CmsGrammarRulesManager({ topicId, rules }: { topicId: string; rules: Rule[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);

  const request = async (url: string, method: "POST" | "PATCH" | "DELETE", body?: object) => {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? "Unable to save grammar rule.");
  };

  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    void request(`/api/admin/grammar/${topicId}/rules`, "POST", {
      title: form.get("title"),
      explanation: form.get("explanation"),
      examples: readLines(form.get("examples")),
    }).then(() => {
      event.currentTarget.reset();
      setMessage("Rule created.");
      router.refresh();
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Unable to create rule.")).finally(() => setBusy(false));
  };

  const save = (event: React.FormEvent<HTMLFormElement>, ruleId: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    void request(`/api/admin/grammar/${topicId}/rules/${ruleId}`, "PATCH", {
      title: form.get("title"),
      explanation: form.get("explanation"),
      examples: readLines(form.get("examples")),
    }).then(() => {
      setMessage("Rule updated.");
      router.refresh();
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Unable to update rule.")).finally(() => setBusy(false));
  };

  const remove = () => {
    if (!ruleToDelete) return;
    setBusy(true);
    setMessage("");
    void request(`/api/admin/grammar/${topicId}/rules/${ruleToDelete.id}`, "DELETE")
      .then(() => {
        setRuleToDelete(null);
        setMessage("Rule deleted.");
        router.refresh();
      })
      .catch((reason) => setMessage(reason instanceof Error ? reason.message : "Unable to delete rule."))
      .finally(() => setBusy(false));
  };

  return <section className="mt-4 space-y-3">
    {rules.map((rule) => <form key={rule.id} onSubmit={(event) => save(event, rule.id)} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3">
        <label className="text-sm font-semibold">Rule title<input name="title" defaultValue={rule.title} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-semibold">Explanation<textarea name="explanation" defaultValue={rule.explanation} className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-semibold">Examples <span className="font-normal text-slate-500">(one per line)</span><textarea name="examples" defaultValue={asLines(rule.examples)} className="mt-1 min-h-16 w-full rounded border border-slate-300 px-3 py-2" /></label>
        <div className="flex gap-3"><button disabled={busy} className="rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 disabled:opacity-50">Save rule</button><button type="button" disabled={busy} onClick={() => setRuleToDelete(rule)} className="text-sm font-semibold text-red-700 hover:underline">Delete</button></div>
      </div>
    </form>)}
    <form onSubmit={create} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <h3 className="font-bold text-slate-950">Add a rule</h3>
      <div className="mt-3 grid gap-3"><input name="title" required placeholder="Rule title" className="rounded border border-slate-300 bg-white px-3 py-2" /><textarea name="explanation" required minLength={10} placeholder="Clear explanation" className="min-h-24 rounded border border-slate-300 bg-white px-3 py-2" /><textarea name="examples" placeholder={"Example one\nExample two"} className="min-h-16 rounded border border-slate-300 bg-white px-3 py-2" /><button disabled={busy} className="w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add rule</button></div>
    </form>
    {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
    <ConfirmDialog open={ruleToDelete !== null} onOpenChange={(open) => { if (!open) setRuleToDelete(null); }} title={`Delete “${ruleToDelete?.title ?? "this rule"}”?`} description="The rule will be removed from this grammar topic." confirmLabel="Delete rule" onConfirm={remove} isProcessing={busy}>
      <p>Existing learner records remain protected by the server-side content rules.</p>
    </ConfirmDialog>
  </section>;
}
