"use client";

import { useLocale } from "@/core/i18n/locale";
import styles from "./SearchStatus.module.css";

export function SearchLoading() {
  const { t } = useLocale();
  return <div className={styles.message} role="status">{t("search.loading")}</div>;
}
