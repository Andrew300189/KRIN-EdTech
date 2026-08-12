import type { SearchGroup as SearchGroupType } from "@/modules/search/types";
import { SearchResultItem } from "@/modules/search/components/SearchResultItem";
import styles from "./SearchGroup.module.css";

export function SearchGroup({ group, query, activeIndex, offset, idPrefix, onHover, onResultClick, onSelect }: { group: SearchGroupType; query: string; activeIndex: number; offset: number; idPrefix: string; onHover: (index: number) => void; onResultClick: (item: SearchGroupType["items"][number], position: number) => void; onSelect: () => void }) {
  return <section className={styles.group}><h3 className={styles.heading}>{group.label}</h3><div className={styles.items}>{group.items.map((item, index) => {
    const absoluteIndex = offset + index;
    return <SearchResultItem key={`${group.key}-${item.type}-${item.id}`} id={`${idPrefix}-option-${absoluteIndex}`} query={query} result={item} active={absoluteIndex === activeIndex} position={absoluteIndex} onHover={() => onHover(absoluteIndex)} onResultClick={() => onResultClick(item, absoluteIndex)} onSelect={onSelect} />;
  })}</div></section>;
}
