"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import styles from "./Achievements.module.css";

/** Client affordance only; the API owns activation eligibility and the
 * progress baseline so the action stays safe to retry. */
export function QuestActivationButton({ questId }: { questId: string }) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  async function activate() {
    if (activating) return;
    setActivating(true);
    try {
      const response = await fetch("/api/profile/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId: questId }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to activate this quest.");
      toast.success("Quest activated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to activate this quest.");
    } finally {
      setActivating(false);
    }
  }

  return <button type="button" className={styles.activateButton} onClick={() => void activate()} disabled={activating}>
    {activating ? "Activating…" : "Activate quest"}
  </button>;
}
