import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { SupportTicketForm } from "@/modules/communications/components/SupportTicketForm";

export default async function NewSupportTicketPage() { const authenticated = await requireAuth(); if (!authenticated) redirect("/login?next=/profile/support/new"); return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/profile/support" className="text-sm font-semibold text-blue-700 hover:underline">← Support center</Link><h1 className="mt-4 text-4xl font-bold">Create a support ticket</h1><p className="mt-2 text-slate-600">Do not include passwords, card numbers, or verification codes.</p><SupportTicketForm /></main>; }
