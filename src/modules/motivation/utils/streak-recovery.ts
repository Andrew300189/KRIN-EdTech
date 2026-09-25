import { dateDistanceInDays, safeTimeZone, userLocalDate } from "./local-date";

type StreakSnapshot = {
  currentStreak: number;
  lastQualifiedDate: string | null;
  freezeCount: number;
};

/** A freeze protects exactly one missed local day, not an open-ended absence. */
export function hasBurnedDailyStreak(streak: StreakSnapshot, localDate: string) {
  if (streak.currentStreak < 1 || !streak.lastQualifiedDate) return false;
  const gap = dateDistanceInDays(streak.lastQualifiedDate, localDate);
  return gap > (streak.freezeCount > 0 ? 2 : 1);
}

/** Count only days already earned; restoring before today's lesson adds no day. */
export function restoredDailyStreakLength(recoverableStreak: number, currentStreak: number) {
  return Math.max(0, recoverableStreak) + Math.max(0, currentStreak);
}

/** Server-side start of the learner's calendar day, including DST offsets. */
export function localDayStartUtc(localDate: string, timeZone: string) {
  const target = Date.parse(`${localDate}T00:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  let instant = target;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((value) => value.type === type)?.value ?? 0);
    const shownLocal = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    instant += target - shownLocal;
  }
  return new Date(instant);
}

/** Historic losses may have been recorded just after a completed lesson.
 * Include first-try results from that local return day, not older lessons. */
export function waterLilyEligibilityStart(lostAt: Date, timeZone: string) {
  return localDayStartUtc(userLocalDate(timeZone, lostAt), timeZone);
}
