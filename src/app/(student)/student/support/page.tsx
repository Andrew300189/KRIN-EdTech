import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";
import { listUserTickets } from "@/modules/communications/services/support.service";
import styles from "./StudentSupport.module.css";

export default async function StudentSupportPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) redirect(guard.status === 401 ? "/login?reason=session_required" : getRoleWorkspacePath(guard.role));
  const { tickets } = await listUserTickets(guard.user.id);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><p>Private support</p><h2>Support center</h2><span>Create and follow private requests about your account, learning or purchase.</span></div>
        <Link href="/student/support/new">New ticket</Link>
      </header>
      {tickets.length ? <div className={styles.list}>{tickets.map((ticket) => <Link key={ticket.id} href={`/student/support/${ticket.id}`} className={styles.ticket}><p>{ticket.number}</p><h3>{ticket.subject}</h3><span>{ticket.status.replace(/_/g, " ")} · {ticket.category?.title || "General"} · {ticket._count.messages} {ticket._count.messages === 1 ? "message" : "messages"}</span></Link>)}</div> : <section className={styles.empty}><h3>No support tickets yet</h3><p>That is completely fine. Create a request when you need help with access, learning or a purchase.</p><Link href="/student/support/new">Create a ticket</Link></section>}
    </section>
  );
}
