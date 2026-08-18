"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";

type DeletionImpact = {
  courseId: string;
  title: string;
  wasEverPublished: boolean;
  studentsAdded: number;
  legacyEnrolments: number;
  progressRecords: number;
  activeProgressions: number;
  teacherAssignments: number;
  purchases: number;
  entitlements: number;
  analyticsRecords: number;
  learnerVocabularyRecords: number;
  commerceProducts: number;
  commerceProductHistory: number;
  certificates: number;
  canDelete: boolean;
  blockers: string[];
};

type CmsCourseDeletionControlProps = {
  initialImpact: DeletionImpact;
  className?: string;
};

/** Owner-only terminal action. The server repeats all impact checks on DELETE. */
export function CmsCourseDeletionControl({ initialImpact, className }: CmsCourseDeletionControlProps) {
  const router = useRouter();
  const [impact, setImpact] = useState(initialImpact);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  function archive() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/content/COURSE/${impact.courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ARCHIVE" }),
      });
      const payload = await response.json() as { error?: string };
      setMessage(response.ok ? "Course archived. Learner history was preserved." : payload.error ?? "Unable to archive course.");
      if (response.ok) router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/courses/${impact.courseId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; impact?: DeletionImpact };
      if (response.status === 409 && payload.impact) {
        setImpact(payload.impact);
        setMessage(payload.error ?? "Deletion is no longer safe; archive the course instead.");
        setConfirmDelete(false);
        return;
      }
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to delete course.");
        return;
      }
      setConfirmDelete(false);
      router.push("/cms/courses");
      router.refresh();
    });
  }

  const confirmation = <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete course?" description="Are you sure you want to delete this course? This action cannot be undone." confirmLabel="Yes, delete" cancelLabel="No" onConfirm={remove} isProcessing={isPending}>
    <p>The server will check learner, progress and payment records one more time before the course is removed.</p>
  </ConfirmDialog>;

  return <div className={className}>
      {impact.canDelete
        ? <button type="button" disabled={isPending} onClick={() => setConfirmDelete(true)}>Delete</button>
        : <button type="button" disabled={isPending} onClick={archive}>Archive</button>}
      {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
    {confirmation}
  </div>;
}
