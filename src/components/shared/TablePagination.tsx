import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import { getPageSummary } from '@/lib/pagination';

type TablePaginationProps = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function TablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const summary = getPageSummary(pageIndex, pageSize, totalItems);
  const safePageCount = Math.max(pageCount, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span>{summary.label}</span>
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap">Filas por página</span>
          <Select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 w-20 px-2 text-xs"
            aria-label="Filas por página"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap">
          Página {pageIndex + 1} de {safePageCount}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
            aria-label="Ir a la página anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={pageIndex >= safePageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
            aria-label="Ir a la página siguiente"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
