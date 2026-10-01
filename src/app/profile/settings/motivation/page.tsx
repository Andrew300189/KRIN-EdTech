import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { MotivationSettingsForm } from "@/modules/motivation/components/MotivationSettingsForm";

export default async function MotivationSettingsPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/settings/motivation");
  const locale = authenticated.user.interfaceLanguage === "uk" ? "uk" : authenticated.user.interfaceLanguage === "ru" ? "ru" : "en";
  const copy = {
    en: { back: "Analytics", title: "Motivation settings", intro: "Your timezone defines daily goals, streaks and calendar days." },
    ru: { back: "Аналитика", title: "Настройки обучения", intro: "Часовой пояс определяет учебные дни, цели и серии." },
    uk: { back: "Аналітика", title: "Налаштування навчання", intro: "Часовий пояс визначає навчальні дні, цілі та серії." },
  }[locale];
  return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/profile/analytics" className="text-sm font-semibold text-blue-700 hover:underline">← {copy.back}</Link><h1 className="mt-4 text-4xl font-bold">{copy.title}</h1><p className="mt-2 text-slate-600">{copy.intro}</p><MotivationSettingsForm initial={{ dailyGoalMinutes: authenticated.user.dailyGoalMinutes, timeZone: authenticated.user.timeZone, showInLeaderboard: authenticated.user.showInLeaderboard, showPublicProfile: authenticated.user.showPublicProfile }} /></main>;
}
