import { prisma } from "@/core/server/prisma";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { getUserPresence } from "@/core/server/presence";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { CmsUserActions } from "@/modules/cms/components/CmsUserActions";
import { CmsUsersPresenceRefresh } from "@/modules/cms/components/CmsUsersPresenceRefresh";
import styles from "@/modules/cms/components/CmsUsersWorkspace.module.css";

function roleLabel(role: string) {
  if (role === "TEACHER") return "Teacher";
  if (role === "STUDENT") return "Student";
  return role.replace(/_/g, " ");
}

function initials(name: string, email: string) {
  const letters = name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("");
  return (letters || email.slice(0, 2)).toUpperCase();
}

export default async function CmsUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, isBlocked: true, deletedAt: true, lastActiveAt: true, createdAt: true },
  });
  const onlineUsers = users.filter((user) => !user.deletedAt && !user.isBlocked && getUserPresence(user.lastActiveAt) === "ONLINE").length;
  const archivedUsers = users.filter((user) => user.deletedAt).length;
  const teachers = users.filter((user) => user.role === "TEACHER" && !user.deletedAt).length;

  return (
    <CmsPageShell
      eyebrow="Account administration"
      title="Users"
      description="Manage access without losing protected learning, payment or audit records. Deleting an account archives it and can be reversed later."
    >
      <CmsUsersPresenceRefresh />
      <section className={styles.metrics} aria-label="User overview">
        <article><span>Accounts</span><strong>{users.length}</strong><small>Latest 100 accounts</small></article>
        <article><span>Online now</span><strong>{onlineUsers}</strong><small>Active in the last 2 minutes</small></article>
        <article><span>Teachers</span><strong>{teachers}</strong><small>Active teacher accounts</small></article>
        <article><span>Archived</span><strong>{archivedUsers}</strong><small>Available for restoration</small></article>
      </section>

      <section className={styles.directory} aria-label="User directory">
        <div className={styles.directoryHeader}>
          <div>
            <h2>Account directory</h2>
            <p>Each row shows the account role, access state and safe management action.</p>
          </div>
          <span className={styles.countBadge}>{users.length} accounts</span>
        </div>

        {users.length ? <div className={styles.rowTableWrap}><div className={styles.rowTable} role="table" aria-label="User accounts">
          <div className={styles.rowHeading} role="row">
            <span role="columnheader">User</span><span role="columnheader">Role</span><span role="columnheader">Access</span><span role="columnheader">Presence</span><span role="columnheader">Last activity</span><span role="columnheader">Action</span>
          </div>
          {users.map((user) => {
          const archived = Boolean(user.deletedAt);
          const owner = isPlatformOwner(user.email);
          const accessState = archived ? "Deleted" : user.isBlocked ? "Blocked" : "Active";
          const accessClass = archived ? styles.statusArchived : user.isBlocked ? styles.statusBlocked : styles.statusActive;
          const online = !archived && !user.isBlocked && getUserPresence(user.lastActiveAt) === "ONLINE";
          const displayName = user.name || user.email;

          return <div key={user.id} role="row" className={`${styles.userRow}${archived ? ` ${styles.archivedRow}` : ""}`}>
            <div role="cell" className={`${styles.rowCell} ${styles.userCell}`}>
              <span className={styles.avatar} aria-hidden="true">{initials(displayName, user.email)}</span>
              <div className={styles.identity}>
                <h3>{displayName}</h3>
                <p title={user.email}>{user.email}</p>
              </div>
            </div>
            <div role="cell" className={styles.rowCell}><span className={styles.cellLabel}>Role</span><span className={styles.cellValue}>{owner ? "Platform owner" : roleLabel(user.role)}</span></div>
            <div role="cell" className={styles.rowCell}><span className={styles.cellLabel}>Access</span><span className={`${styles.cellValue} ${styles.accessValue} ${accessClass}`}>{accessState}</span></div>
            <div role="cell" className={styles.rowCell}><span className={styles.cellLabel}>Presence</span><span className={`${styles.presence} ${online ? styles.presenceOnline : styles.presenceOffline}`}><span aria-hidden="true" />{online ? "Online" : "Offline"}</span></div>
            <div role="cell" className={styles.rowCell}><span className={styles.cellLabel}>Last activity</span><span className={styles.cellValue} title={user.lastActiveAt?.toLocaleString("en-GB")}>{user.lastActiveAt ? user.lastActiveAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "No activity"}</span></div>
            <div role="cell" className={`${styles.rowCell} ${styles.actionCell}`}>
              <CmsUserActions userId={user.id} userName={displayName} archived={archived} isOwner={owner} />
            </div>
          </div>;
        })}</div></div> : <div className={styles.emptyState}><h2>No users yet</h2><p>New accounts will appear here after registration.</p></div>}
      </section>
    </CmsPageShell>
  );
}
