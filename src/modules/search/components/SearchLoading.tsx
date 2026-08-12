import styles from "./SearchStatus.module.css";

export function SearchLoading() { return <div className={styles.message} role="status">Searching…</div>; }
