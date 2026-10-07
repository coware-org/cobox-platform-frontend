import { useCallback, useMemo, useState } from 'react';
import { clampPageIndex, getPageCount, paginate } from '@/lib/pagination';

type UsePaginationOptions<T> = {
  items: readonly T[];
  initialPageSize?: number;
  pageSizeOptions?: readonly number[];
};

/**
 * La página visible se deriva con clamp en cada render: si un filtro reduce
 * los resultados, se muestra la última página válida sin efectos ni resets.
 *
 * `pageItems` mantiene una referencia estable entre renders mientras no cambien
 * los items ni la página. TanStack Table dispara su auto-reset de paginación
 * cada vez que `data` cambia de referencia, lo que entra en bucle infinito.
 */
export function usePagination<T>({
  items,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
}: UsePaginationOptions<T>) {
  const [rawPageIndex, setRawPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const pageCount = getPageCount(totalItems, pageSize);
  const pageIndex = clampPageIndex(rawPageIndex, pageCount);

  const pageItems = useMemo(
    () => paginate(items, pageIndex, pageSize),
    [items, pageIndex, pageSize],
  );

  const setPageIndex = useCallback((nextPageIndex: number) => {
    setRawPageIndex(nextPageIndex);
  }, []);

  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(nextPageSize);
    setRawPageIndex(0);
  }, []);

  return {
    pageItems,
    pageIndex,
    pageSize,
    pageSizeOptions,
    pageCount,
    totalItems,
    setPageIndex,
    setPageSize,
  };
}
