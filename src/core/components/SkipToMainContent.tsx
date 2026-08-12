import styles from "./SkipToMainContent.module.css";

/** Links to the stable application content target rendered by the root layout. */
export function SkipToMainContent() {
  return <a href="#main-content" className={styles.link}>Skip to main content</a>;
}
