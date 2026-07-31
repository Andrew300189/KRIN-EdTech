import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { SupportConversation } from "@/modules/communications/components/SupportConversation";

export default async function SupportTicketPage({ params }: { params: Promise<{ ticketId: string }> }) { const authenticated = await requireAuth(); const { ticketId } = await params; if (!authenticated) redirect(`/login?next=/profile/support/${ticketId}`); return <main className="mx-auto max-w-4xl px-6 py-12"><Link href="/profile/support" className="text-sm font-semibold text-blue-700 hover:underline">← Support center</Link><SupportConversation ticketId={ticketId} /></main>; }
