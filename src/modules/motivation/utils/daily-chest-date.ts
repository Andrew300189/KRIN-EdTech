import { safeTimeZone, userLocalDate } from "./local-date";

export function browserChestTimeZone(value: string | null | undefined) {
  if (!value || value.length > 100) return null;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export function selectedChestTimeZone(profile: string | null | undefined, fixed: string | null | undefined, browser: string | null | undefined) {
  if (fixed) return safeTimeZone(fixed);
  const profileZone = safeTimeZone(profile);
  return profileZone !== "UTC" ? profileZone : browserChestTimeZone(browser) ?? profileZone;
}

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
