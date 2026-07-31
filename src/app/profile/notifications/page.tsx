import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { NotificationCenter } from "@/modules/communications/components/NotificationCenter";
import { NotificationSettingsForm } from "@/modules/communications/components/NotificationSettingsForm";

export default async function NotificationsPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/notifications");
  return <main className="mx-auto max-w-5xl px-6 py-12"><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">← Dashboard</Link><h1 className="mt-4 text-4xl font-bold text-slate-900">Notifications</h1><p className="mt-2 text-slate-600">Account, learning, billing and support updates in one place.</p><NotificationCenter /><NotificationSettingsForm /></main>;
}
