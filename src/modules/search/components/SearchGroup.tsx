import type { SearchGroup as SearchGroupType } from "@/modules/search/types";
import { SearchResultItem } from "@/modules/search/components/SearchResultItem";

export function SearchGroup({
  group,
  query,
  activeIndex,
  offset,
  onHover,
  onResultClick,
  onSelect,
}: {
  group: SearchGroupType;
  query: string;
  activeIndex: number;
  offset: number;
  onHover: (index: number) => void;
  onResultClick: (item: SearchGroupType["items"][number], position: number) => void;
  onSelect: () => void;
}) {
  return (
    <section className="border-t border-slate-100 px-2 py-2 first:border-0">
      <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3>
      <div className="space-y-1">
        {group.items.map((item, index) => {
          const absoluteIndex = offset + index;
          return (
            <SearchResultItem
              key={`${group.key}-${item.type}-${item.id}`}
              id={`search-option-${absoluteIndex}`}
              query={query}
              result={item}
              active={absoluteIndex === activeIndex}
              position={absoluteIndex}
              onHover={() => onHover(absoluteIndex)}
              onResultClick={() => onResultClick(item, absoluteIndex)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </section>
  );
}
