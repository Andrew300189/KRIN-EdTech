import type { ReactNode } from "react";
import styles from "./CmsPageShell.module.css";

type CmsPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function CmsPageShell({ eyebrow, title, description, actions, children }: CmsPageShellProps) {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function CmsEmptyState({ title = "Nothing here yet", description, action }: { title?: string; description: string; action?: ReactNode }) {
  return (
    <section className={styles.emptyState} aria-live="polite">
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </section>
  );
}
