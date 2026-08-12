import styles from "./SearchStatus.module.css";

export function SearchError({ onRetry }: { onRetry: () => void }) { return <div className={`${styles.message} ${styles.error}`}>Unable to perform search. <button type="button" onClick={onRetry} className={styles.retry}>Retry</button></div>; }
