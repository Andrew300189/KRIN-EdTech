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
