import { userLocalDate } from "./local-date";

/** A chest refreshes when the learner's configured calendar day changes. */
export function dailyChestAvailable(claimedAt: Date | null, timeZone: string | null | undefined, now = new Date()) {
  return !claimedAt || userLocalDate(timeZone, claimedAt) < userLocalDate(timeZone, now);
}

/** Find the first instant of tomorrow in the learner's time zone, including DST changes. */
export function nextDailyChestAt(timeZone: string | null | undefined, now = new Date()) {
  const today = userLocalDate(timeZone, now);
  let before = now.getTime();
  let after = before + 48 * 60 * 60 * 1000;
  while (after - before > 1) {
    const middle = before + Math.floor((after - before) / 2);
    if (userLocalDate(timeZone, new Date(middle)) === today) before = middle;
    else after = middle;
  }
  return new Date(after);
}
