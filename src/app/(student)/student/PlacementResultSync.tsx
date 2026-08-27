"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PENDING_PLACEMENT_RESULT_KEY,
  PLACEMENT_DASHBOARD_PATH,
} from "@/modules/courses/services/placement-test-result";
import styles from "./StudentHome.module.css";

type PendingPlacementResult = {
  results: boolean[];
  completedAt: number;
};

function readPendingResult(): PendingPlacementResult | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PLACEMENT_RESULT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingPlacementResult>;
    if (!Array.isArray(value.results) || !value.results.length || value.results.length > 100 || !value.results.every((result) => typeof result === "boolean")) return null;
    return { results: value.results, completedAt: typeof value.completedAt === "number" ? value.completedAt : Date.now() };
  } catch {
    return null;
  }
}

/** Transfers the anonymous result only after an authenticated dashboard is open. */
export function PlacementResultSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const shouldSave = searchParams.get("placement") === "1";

  useEffect(() => {
    if (!shouldSave) return;
    const pending = readPendingResult();
    if (!pending) {
      router.replace("/student");
      return;
    }

    let active = true;
    setState("saving");
    void fetch("/api/learning/placement-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: pending.results }),
    })
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "We could not save your placement result.");
        window.sessionStorage.removeItem(PENDING_PLACEMENT_RESULT_KEY);
        router.replace(PLACEMENT_DASHBOARD_PATH.replace("?placement=1", "?placement=complete"));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "We could not save your placement result.");
      });

    return () => { active = false; };
  }, [retry, router, shouldSave]);

  if (!shouldSave) return null;

  return <section className={styles.placementSync} aria-live="polite">
    {state === "saving" ? <><span aria-hidden>✨</span><div><strong>Building your personal course plan…</strong><p>Your result is being saved securely to your dashboard.</p></div></> : null}
    {state === "error" ? <><span aria-hidden>!</span><div><strong>Your result is ready, but was not saved yet.</strong><p>{error}</p><button type="button" onClick={() => { setError(""); setState("idle"); setRetry((value) => value + 1); }}>Try again</button></div></> : null}
  </section>;
}
