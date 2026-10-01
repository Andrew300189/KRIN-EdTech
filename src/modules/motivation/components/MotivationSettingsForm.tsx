"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "@/core/i18n/locale";

const copy = {
  en: { goal: "Daily active-learning goal", minutes: "minutes", zone: "Time zone", leaderboard: "Show my first name on the public leaderboard", leaderboardDetail: "Only your first name, level and ranking XP appear. Your email and learning history stay private.", profile: "Let other learners open my progress profile", profileDetail: "Shows your avatar, level, streak and learning summary; never your email, balance or answers.", note: "Only server-confirmed active time counts toward your goal and streak.", save: "Save settings", saved: "Settings saved.", error: "Unable to save settings." },
  ru: { goal: "Ежедневная цель активного обучения", minutes: "минут", zone: "Часовой пояс", leaderboard: "Показывать моё имя в публичном рейтинге", leaderboardDetail: "Видны только имя, уровень и XP рейтинга. Почта и история обучения скрыты.", profile: "Разрешить другим открыть мой профиль достижений", profileDetail: "Видны аватар, уровень, серия и общий прогресс; почта, баланс и ответы скрыты.", note: "В цель и серию входит только активное время, подтверждённое сервером.", save: "Сохранить настройки", saved: "Настройки сохранены.", error: "Не удалось сохранить настройки." },
  uk: { goal: "Щоденна мета активного навчання", minutes: "хвилин", zone: "Часовий пояс", leaderboard: "Показувати моє ім’я у публічному рейтингу", leaderboardDetail: "Видно лише ім’я, рівень і XP рейтингу. Пошта та історія навчання приховані.", profile: "Дозволити іншим переглядати мій профіль досягнень", profileDetail: "Видно аватар, рівень, серію і загальний прогрес; пошта, баланс і відповіді приховані.", note: "До мети й серії входить лише активний час, підтверджений сервером.", save: "Зберегти налаштування", saved: "Налаштування збережено.", error: "Не вдалося зберегти налаштування." },
} as const;

export function MotivationSettingsForm({ initial }: { initial: { dailyGoalMinutes: number; timeZone: string; showInLeaderboard?: boolean; showPublicProfile?: boolean } }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/profile/motivation/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setStatus(response.ok ? text.saved : text.error);
  }
  return <form onSubmit={(event) => void save(event)} className="mt-7 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2">
    <label className="text-sm font-semibold">{text.goal}<select value={settings.dailyGoalMinutes} onChange={(event) => setSettings({ ...settings, dailyGoalMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{[5, 10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} {text.minutes}</option>)}</select></label>
    <label className="text-sm font-semibold">{text.zone}<input value={settings.timeZone} onChange={(event) => setSettings({ ...settings, timeZone: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Europe/Kyiv" /></label>
    <label className="flex items-start gap-3 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={settings.showInLeaderboard ?? false} onChange={(event) => setSettings({ ...settings, showInLeaderboard: event.target.checked, showPublicProfile: event.target.checked ? settings.showPublicProfile : false })} className="mt-1 h-4 w-4" /><span><strong>{text.leaderboard}</strong><br />{text.leaderboardDetail}</span></label>
    <label className="flex items-start gap-3 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={settings.showPublicProfile ?? false} disabled={settings.showInLeaderboard !== true} onChange={(event) => setSettings({ ...settings, showPublicProfile: event.target.checked })} className="mt-1 h-4 w-4 disabled:cursor-not-allowed" /><span><strong>{text.profile}</strong><br />{text.profileDetail}</span></label>
    <p className="text-sm text-slate-600 md:col-span-2">{text.note}</p>
    <div className="md:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">{text.save}</button>{status ? <p role="status" className="mt-3 text-sm text-slate-700">{status}</p> : null}</div>
  </form>;
}
