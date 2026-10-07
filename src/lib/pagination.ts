export type PageState = {
  pageIndex: number;
  pageSize: number;
};

export type PageSummary = {
  from: number;
  to: number;
  label: string;
};

export function getPageCount(totalItems: number, pageSize: number): number {
  if (!Number.isFinite(totalItems) || totalItems <= 0) return 0;
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 0;

  return Math.ceil(totalItems / pageSize);
}

export function clampPageIndex(pageIndex: number, pageCount: number): number {
  if (!Number.isFinite(pageIndex) || pageIndex < 0) return 0;
  if (pageCount <= 0) return 0;

  return Math.min(Math.floor(pageIndex), pageCount - 1);
}

export function paginate<T>(items: readonly T[], pageIndex: number, pageSize: number): T[] {
  if (items.length === 0) return [];
  if (!Number.isFinite(pageSize) || pageSize <= 0) return [...items];

  const safeIndex = clampPageIndex(pageIndex, getPageCount(items.length, pageSize));

  return items.slice(safeIndex * pageSize, safeIndex * pageSize + pageSize);
}

export function getPageSummary(pageIndex: number, pageSize: number, totalItems: number): PageSummary {
  if (totalItems <= 0 || pageSize <= 0) {
    return { from: 0, to: 0, label: 'Mostrando 0 de 0' };
  }

  const safeIndex = clampPageIndex(pageIndex, getPageCount(totalItems, pageSize));
  const from = safeIndex * pageSize + 1;
  const to = Math.min(from + pageSize - 1, totalItems);

  return { from, to, label: `Mostrando ${from}-${to} de ${totalItems}` };
}
