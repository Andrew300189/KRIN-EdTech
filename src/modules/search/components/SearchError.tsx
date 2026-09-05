"use client";

import { useLocale } from "@/core/i18n/locale";
import styles from "./SearchStatus.module.css";

export function SearchError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return <div className={`${styles.message} ${styles.error}`}>{t("search.error")} <button type="button" onClick={onRetry} className={styles.retry}>{t("search.retry")}</button></div>;
}
