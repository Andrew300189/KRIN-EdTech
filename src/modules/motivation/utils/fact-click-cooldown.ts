export const FACT_CLICK_INTERVAL_MS = 7_000;

/** A click cannot deliver or reward another fact inside this server-side window. */
export function factClickRetryAfterSeconds(lastFactAt: Date | null | undefined, now = new Date()) {
  if (!lastFactAt) return 0;
  return Math.max(0, Math.ceil((FACT_CLICK_INTERVAL_MS - (now.getTime() - lastFactAt.getTime())) / 1_000));
}
