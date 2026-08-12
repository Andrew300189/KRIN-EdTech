import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";
import { SupportTicketForm } from "@/modules/communications/components/SupportTicketForm";
import styles from "../StudentSupport.module.css";

export default async function StudentNewSupportTicketPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) redirect(guard.status === 401 ? "/login?reason=session_required" : getRoleWorkspacePath(guard.role));
  return <section className={styles.page}><header className={styles.header}><div><p>Private support</p><h2>Create a support ticket</h2><span>Do not include passwords, card numbers or verification codes.</span></div><Link href="/student/support">Back to support</Link></header><SupportTicketForm getTicketHref={(ticketId) => `/student/support/${ticketId}`} /></section>;
}
