"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: string; title: string; message: string; actionUrl: string | null; readAt: string | null; createdAt: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const load = async () => {
    const [countResponse, listResponse] = await Promise.all([fetch("/api/notifications/unread-count", { cache: "no-store" }), fetch("/api/notifications?limit=5", { cache: "no-store" })]);
    if (countResponse.ok) setCount((await countResponse.json()).unreadCount ?? 0);
    if (listResponse.ok) setItems((await listResponse.json()).notifications ?? []);
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);
  async function read(id: string) { await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read" }) }); void load(); }
  return <div className="relative"><button type="button" aria-label={`Notifications${count ? `, ${count} unread` : ""}`} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void load(); }} className="relative rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"><span aria-hidden="true" className="text-xl">🔔</span>{count ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">{count > 99 ? "99+" : count}</span> : null}</button>{open ? <section aria-label="Recent notifications" className="absolute right-0 z-30 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Notifications</h2><Link href="/profile/notifications" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => setOpen(false)}>View all</Link></div><ul className="mt-2 divide-y divide-slate-100">{items.length ? items.map((item) => <li key={item.id} className={`py-3 ${item.readAt ? "" : "rounded bg-blue-50 px-2"}`}><Link href={item.actionUrl || "/profile/notifications"} onClick={() => { void read(item.id); setOpen(false); }} className="block focus:outline-none focus:ring-2 focus:ring-blue-600"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></Link></li>) : <li className="py-6 text-center text-sm text-slate-500">No notifications yet.</li>}</ul></section> : null}</div>;
}
