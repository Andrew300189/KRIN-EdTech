"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function WorkspaceShell({ title, navigation, children }: { title: string; navigation: { href: string; label: string }[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return <div className="min-h-screen bg-slate-50 lg:flex"><aside className="border-b bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r"><div className="p-6"><Link href="/" className="text-xl font-bold text-primary">KRIN EdTech</Link><p className="mt-1 text-sm text-slate-500">{title}</p></div><nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1" aria-label={`${title} navigation`}>{navigation.map((item) => { const active = pathname === item.href || (item.href !== "/student" && item.href !== "/teacher" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100"}`}>{item.label}</Link>; })}</nav></aside><main className="min-w-0 flex-1"><header className="flex items-center justify-between border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-slate-900">{title}</h1><button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); }} className="text-sm font-semibold text-slate-600 hover:text-slate-950">Sign out</button></header><div className="mx-auto max-w-7xl p-5 md:p-8">{children}</div></main></div>;
}
