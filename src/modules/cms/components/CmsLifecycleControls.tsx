"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CmsEntityType = "LANGUAGE_LEVEL" | "CURRICULUM_NODE" | "COURSE_CATEGORY" | "COURSE" | "COURSE_MODULE" | "LESSON" | "LESSON_BLOCK" | "EXERCISE" | "GRAMMAR_TOPIC" | "WORD" | "CONTENT_SLOT";
type LifecycleAction = "PUBLISH" | "SUBMIT_FOR_REVIEW" | "UNPUBLISH" | "SCHEDULE" | "ARCHIVE" | "RESTORE";

export function CmsLifecycleControls({ entityType, entityId, status, compact = false }: { entityType: CmsEntityType; entityId: string; status: string; compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(action: LifecycleAction) {
    setMessage(null);
    if (action === "SCHEDULE" && !scheduledAt) {
      setMessage("Choose a future publication time.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cms/content/${entityType}/${entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, scheduledAt: action === "SCHEDULE" ? new Date(scheduledAt).toISOString() : undefined }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to update content.");
        setMessage(action === "ARCHIVE" ? "Archived." : action === "RESTORE" ? "Restored to drafts." : "Content updated.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update content.");
      }
    });
  }

  const buttonClass = compact ? "rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50" : "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
  const canPreparePublication = status === "DRAFT" || status === "REVIEW" || status === "UNPUBLISHED" || status === "SCHEDULED";
  return <div className="space-y-2"><div className="flex flex-wrap items-center gap-2">{canPreparePublication ? <button type="button" disabled={isPending} onClick={() => run("PUBLISH")} className={`${buttonClass} border-emerald-300 text-emerald-800`}>Publish</button> : null}{(status === "DRAFT" || status === "UNPUBLISHED") ? <button type="button" disabled={isPending} onClick={() => run("SUBMIT_FOR_REVIEW")} className={buttonClass}>Send to review</button> : null}{status === "PUBLISHED" ? <button type="button" disabled={isPending} onClick={() => run("UNPUBLISH")} className={buttonClass}>Unpublish</button> : null}{status !== "ARCHIVED" ? <button type="button" disabled={isPending} onClick={() => run("ARCHIVE")} className={`${buttonClass} border-rose-300 text-rose-800`}>Archive</button> : <button type="button" disabled={isPending} onClick={() => run("RESTORE")} className={buttonClass}>Restore draft</button>}</div>{canPreparePublication ? <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`schedule-${entityId}`}>Schedule publication</label><input id={`schedule-${entityId}`} type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs" /><button type="button" disabled={isPending} onClick={() => run("SCHEDULE")} className={buttonClass}>Schedule</button></div> : null}{message ? <p role="status" className="text-xs text-slate-600">{message}</p> : null}</div>;
}
