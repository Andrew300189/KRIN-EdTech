export const MOTIVATION_UPDATED_EVENT = "krin:motivation-updated";
export const STREAK_RECOVERY_OPEN_EVENT = "krin:streak-recovery-open";

/** Notify visible profile widgets after a server-confirmed XP or coin award. */
export function notifyMotivationUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MOTIVATION_UPDATED_EVENT));
}
