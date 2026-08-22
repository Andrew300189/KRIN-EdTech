import type { ReactNode } from "react";
import styles from "./CmsPageShell.module.css";

type CmsPageShellProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  titleMeta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  dense?: boolean;
};

export function CmsPageShell({ eyebrow, title, description, titleMeta, actions, children, compact = false, dense = false }: CmsPageShellProps) {
  return (
    <section className={`${styles.page}${compact ? ` ${styles.compact}` : ""}`}>
      <header className={`${styles.header}${dense ? ` ${styles.denseHeader}` : ""}`}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <div className={styles.titleRow}>
            {typeof title === "string" || typeof title === "number" ? <h1 className={styles.title}>{title}</h1> : <div className={styles.title}>{title}</div>}
            {titleMeta ? <div className={styles.titleMeta}>{titleMeta}</div> : null}
          </div>
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
