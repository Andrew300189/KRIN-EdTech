import styles from "./SearchStatus.module.css";

export function SearchEmpty({ message }: { message: string }) { return <div className={styles.message}>{message}</div>; }
