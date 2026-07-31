"use client";

export type RewardNotificationEvent = { type: "XP_GAINED" | "COINS_GAINED" | "LEVEL_UP" | "ACHIEVEMENT_UNLOCKED" | "STREAK_UPDATED" | "DAILY_GOAL_COMPLETED" | "COURSE_COMPLETED"; title: string; detail?: string };

export function RewardNotification({ events }: { events: RewardNotificationEvent[] }) {
  if (!events.length) return null;
  return <aside aria-live="polite" className="fixed bottom-5 right-5 z-50 max-w-sm space-y-2">{events.slice(0, 3).map((event, index) => <div key={`${event.type}-${index}`} className="rounded-xl border border-blue-200 bg-white p-4 shadow-lg"><p className="font-semibold text-slate-900">{event.title}</p>{event.detail ? <p className="mt-1 text-sm text-slate-600">{event.detail}</p> : null}</div>)}</aside>;
}
