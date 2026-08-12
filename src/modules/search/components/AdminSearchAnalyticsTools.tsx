"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import { SEARCH_CONTEXTS } from "@/modules/search/types";

type CleanupResponse = {
  data?: {
    retentionDays: number;
    dryRun: boolean;
    deletedHistoryRows: number;
    deletedMetricRows: number;
  };
  error?: string;
};

export function AdminSearchAnalyticsTools({
  defaultDays = 30,
}: {
  defaultDays?: number;
}) {
  const [days, setDays] = useState(String(defaultDays));
  const [context, setContext] = useState("");
  const [retentionDays, setRetentionDays] = useState("180");
  const [dryRun, setDryRun] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("days", days || String(defaultDays));
    if (context) params.set("context", context);
    return `/api/admin/analytics/search/export?${params.toString()}`;
  }, [context, days, defaultDays]);

  const runCleanup = async () => {
    const parsedRetention = Number(retentionDays);
    if (
      !Number.isFinite(parsedRetention) ||
      parsedRetention < 30 ||
      parsedRetention > 1095
    ) {
      setMessage("Retention must be between 30 and 1095 days.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/analytics/search/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: parsedRetention, dryRun }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as CleanupResponse | null;
      if (!response.ok || !payload?.data) {
        setMessage(payload?.error ?? "Cleanup request failed.");
        return;
      }

      const result = payload.data;
      setMessage(
        `${result.dryRun ? "Dry run" : "Cleanup"} finished: ${result.deletedHistoryRows} history rows and ${result.deletedMetricRows} metric rows ${result.dryRun ? "would be" : "were"} removed.`,
      );
    } catch {
      setMessage("Cleanup request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Search analytics tools
        </h3>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">Export CSV</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                aria-label="Export period in days"
              />
              <select
                value={context}
                onChange={(event) => setContext(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                aria-label="Export context"
              >
                <option value="">All contexts</option>
                {SEARCH_CONTEXTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <a
              href={exportHref}
              className="mt-3 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Download CSV
            </a>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">
              Retention cleanup
            </p>
            <div className="mt-3 grid gap-2">
              <input
                type="number"
                min={30}
                max={1095}
                value={retentionDays}
                onChange={(event) => setRetentionDays(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                aria-label="Retention in days"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(event) => setDryRun(event.target.checked)}
                />
                Dry run only
              </label>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (dryRun) void runCleanup();
                else setConfirmCleanup(true);
              }}
              className="mt-3 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Running..."
                : dryRun
                  ? "Run dry cleanup"
                  : "Run cleanup"}
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-3 text-sm text-slate-700">{message}</p>
        ) : null}
      </section>
      <ConfirmDialog
        open={confirmCleanup}
        onOpenChange={setConfirmCleanup}
        title="Delete old search analytics?"
        description={`This permanently removes search analytics older than ${retentionDays || "the chosen"} days.`}
        confirmLabel="Delete analytics"
        onConfirm={() => {
          setConfirmCleanup(false);
          void runCleanup();
        }}
        isProcessing={isSubmitting}
      >
        <p>
          This action cannot be restored. Run a dry cleanup first if you need to
          review the effect.
        </p>
      </ConfirmDialog>
    </>
  );
}
