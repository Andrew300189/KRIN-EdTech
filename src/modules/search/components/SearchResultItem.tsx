import Link from "next/link";
import type { SearchResult } from "@/modules/search/types";
import { highlightText } from "@/modules/search/utils/highlight";
import styles from "./SearchResultItem.module.css";

export function SearchResultItem({ result, query, active, id, position, onHover, onResultClick, onSelect }: { result: SearchResult; query: string; active: boolean; id: string; position: number; onHover: () => void; onResultClick: () => void; onSelect: () => void }) {
  return <Link id={id} href={result.url} role="option" aria-selected={active} onMouseEnter={onHover} onFocus={onHover} onClick={() => { onResultClick(); onSelect(); }} className={`${styles.item} ${active ? styles.active : ""}`} data-search-position={position}><div className={styles.titleRow}><p className={styles.title}>{highlightText(result.title, query)}</p>{result.badge ? <span className={styles.badge}>{result.badge}</span> : null}</div>{result.subtitle ? <p className={styles.subtitle}>{highlightText(result.subtitle, query)}</p> : null}{result.description ? <p className={styles.description}>{highlightText(result.description, query)}</p> : null}</Link>;
}
