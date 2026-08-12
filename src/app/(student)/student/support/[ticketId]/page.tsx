import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";
import { getUserTicket } from "@/modules/communications/services/support.service";
import { SupportConversation } from "@/modules/communications/components/SupportConversation";
import styles from "../StudentSupport.module.css";

export default async function StudentSupportTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const guard = await requireRole(["student"]);
  const { ticketId } = await params;
  if (!guard.ok) redirect(guard.status === 401 ? "/login?reason=session_required" : getRoleWorkspacePath(guard.role));
  const ticket = await getUserTicket(guard.user.id, ticketId);
  if (!ticket) notFound();
  return <section className={styles.page}><Link href="/student/support" className={styles.backLink}>Back to support</Link><SupportConversation ticketId={ticketId} /></section>;
}
