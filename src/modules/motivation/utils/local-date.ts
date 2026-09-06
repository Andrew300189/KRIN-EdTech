import { MOTIVATION_CONFIG } from "@/modules/motivation/constants/motivation-config";

export function safeTimeZone(value: string | null | undefined) {
  try {
    if (value) Intl.DateTimeFormat("en-US", { timeZone: value });
    return value || MOTIVATION_CONFIG.defaultTimeZone;
  } catch {
    return MOTIVATION_CONFIG.defaultTimeZone;
  }
}

export function userLocalDate(timeZone: string | null | undefined, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

/** Hour in the learner's configured time zone, used only for time-based badges. */
export function userLocalHour(timeZone: string | null | undefined, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: safeTimeZone(timeZone), hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

export function dateDistanceInDays(from: string, to: string) {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const end = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((end - start) / 86_400_000);
}

/** Subtract calendar days from an ISO local date without involving a time zone. */
export function subtractLocalDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

/** The Monday that starts the calendar week containing a user's local date.
 * Keeping the key date-only prevents an Easter-egg claim from moving when a
 * learner's browser and the server are in different time zones. */
export function localWeekStart(date: string) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return subtractLocalDays(date, (weekday + 6) % 7);
}
