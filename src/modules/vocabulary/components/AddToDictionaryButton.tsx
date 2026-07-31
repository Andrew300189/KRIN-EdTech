"use client";

import { useState } from "react";

export function AddToDictionaryButton({ wordId, sourceLessonId, compact = false }: { wordId: string; sourceLessonId?: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function add() {
    setState("saving");
    try {
      const response = await fetch("/api/profile/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wordId, sourceLessonId }) });
      if (!response.ok) throw new Error();
      setState("saved");
    } catch { setState("error"); }
  }
  return <div className="inline-flex flex-col items-start gap-1"><button type="button" disabled={state === "saving" || state === "saved"} onClick={() => void add()} className={compact ? "rounded-md border border-blue-700 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60" : "rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"}>{state === "saving" ? "Adding…" : state === "saved" ? "Added" : "Add to dictionary"}</button>{state === "saved" ? <span className="text-xs text-emerald-700">First review is scheduled for today.</span> : null}{state === "error" ? <span className="text-xs text-red-700">Unable to add word.</span> : null}</div>;
}
