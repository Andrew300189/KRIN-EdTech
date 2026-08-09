"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  certificates: number;
  canDelete: boolean;
  blockers: string[];
};

export function CmsCourseDeletionControl({ initialImpact }: { initialImpact: DeletionImpact }) {
  const router = useRouter();
  const [impact, setImpact] = useState(initialImpact);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const impactRows: Array<[string, number]> = [
    [`Course added by ${impact.studentsAdded} student(s)`, impact.studentsAdded],
    [`There are ${impact.activeProgressions} active progression(s)`, impact.activeProgressions],
    [`There are ${impact.progressRecords} total progress record(s)`, impact.progressRecords],
    [`There are ${impact.teacherAssignments} teacher assignment(s)`, impact.teacherAssignments],
    [`There are ${impact.purchases} purchase record(s)`, impact.purchases],
    [`There are ${impact.entitlements} access entitlement(s)`, impact.entitlements],
    [`There are ${impact.analyticsRecords} analytics record(s)`, impact.analyticsRecords],
    [`There are ${impact.learnerVocabularyRecords} learner vocabulary record(s)`, impact.learnerVocabularyRecords],
    [`There are ${impact.commerceProducts} linked commerce product(s)`, impact.commerceProducts],
    [`There are ${impact.certificates} linked certificate(s)`, impact.certificates],
  ];
  const visibleImpact = impactRows.filter(([, count]) => count > 0);

  function archive() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/content/COURSE/${impact.courseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ARCHIVE" }) });
      const payload = await response.json() as { error?: string };
      setMessage(response.ok ? "Course archived. Learner history was preserved." : payload.error ?? "Unable to archive course.");
      if (response.ok) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`Permanently delete “${impact.title}”? This cannot be undone.`)) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/cms/courses/${impact.courseId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; impact?: DeletionImpact };
      if (response.status === 409 && payload.impact) {
        setImpact(payload.impact);
        setMessage(payload.error ?? "Deletion is no longer safe; archive the course instead.");
        return;
      }
      if (!response.ok) { setMessage(payload.error ?? "Unable to delete course."); return; }
      router.push("/cms/courses");
      router.refresh();
    });
  }

  return <section className={`rounded-2xl border p-5 ${impact.canDelete ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
    <h2 className="text-lg font-bold text-slate-950">Archive or permanently delete</h2>
    <p className="mt-1 text-sm text-slate-700">Physical deletion is permitted only for a never-published course with no learners, progress, assignments, purchases, analytics, access rights or certificates.</p>
    {impact.wasEverPublished ? <p className="mt-3 text-sm font-semibold text-rose-900">This course was published before and therefore must be archived.</p> : null}
    {visibleImpact.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">{visibleImpact.map(([label]) => <li key={label}>{label}</li>)}</ul> : <p className="mt-3 text-sm text-slate-700">No learner or commercial impact has been found.</p>}
    <div className="mt-4 flex flex-wrap items-center gap-3">{impact.canDelete ? <button type="button" disabled={isPending} onClick={remove} className="rounded-lg border border-rose-400 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Permanently delete course</button> : <button type="button" disabled={isPending} onClick={archive} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">Archive course instead</button>}{message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}</div>
  </section>;
}
