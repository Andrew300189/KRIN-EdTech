import { useMemo, useState } from 'react';

export default function usePagination<T>(items: T[], perPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [currentPage, items, perPage]);

  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  return { currentPage, totalPages, paginatedItems, goToPage };
}
