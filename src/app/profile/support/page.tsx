import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { listUserTickets } from "@/modules/communications/services/support.service";

export default async function SupportPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/support");
  const { tickets } = await listUserTickets(authenticated.user.id);
  return <main className="mx-auto max-w-5xl px-6 py-12"><header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">← Dashboard</Link><h1 className="mt-4 text-4xl font-bold">Support center</h1><p className="mt-2 text-slate-600">Create and follow your private support requests.</p></div><Link href="/profile/support/new" className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white">New ticket</Link></header><section className="mt-8 space-y-3">{tickets.length ? tickets.map((ticket) => <Link key={ticket.id} href={`/profile/support/${ticket.id}`} className="block rounded-xl border bg-white p-5 hover:border-blue-400"><p className="text-sm font-semibold text-blue-700">{ticket.number}</p><h2 className="mt-1 font-bold text-slate-900">{ticket.subject}</h2><p className="mt-2 text-sm text-slate-600">{ticket.status.replace(/_/g, " ")} · {ticket.category?.title || "General"} · {ticket._count.messages} messages</p></Link>) : <p className="rounded-xl border border-dashed p-6 text-slate-600">You have no support tickets yet.</p>}</section></main>;
}
