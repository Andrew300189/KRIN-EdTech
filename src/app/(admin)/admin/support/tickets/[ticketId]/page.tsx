import Link from "next/link";
import { AdminSupportConversation } from "@/modules/communications/components/AdminSupportConversation";

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ ticketId: string }> }) { const { ticketId } = await params; return <div><Link href="/admin/support/tickets" className="text-sm font-semibold text-blue-700 hover:underline">← Support tickets</Link><AdminSupportConversation ticketId={ticketId} /></div>; }
