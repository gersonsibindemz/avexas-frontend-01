import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  allowedItemsPerPage?: number[];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  allowedItemsPerPage = [10, 20, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, validCurrentPage * itemsPerPage);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-700 select-none">
      <div className="flex items-center gap-2">
        <span className="text-slate-600">Itens por página:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs font-medium"
        >
          {allowedItemsPerPage.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-slate-500 ml-2">
          A mostrar <strong className="font-semibold text-slate-800">{startItem}</strong> a{' '}
          <strong className="font-semibold text-slate-800">{endItem}</strong> de{' '}
          <strong className="font-semibold text-slate-800">{totalItems}</strong> itens
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, validCurrentPage - 1))}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          title="Página anterior"
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              if (totalPages <= 7) return true;
              return (
                page === 1 ||
                page === totalPages ||
                (page >= validCurrentPage - 1 && page <= validCurrentPage + 1)
              );
            })
            .map((page, idx, arr) => {
              const prev = arr[idx - 1];
              const hasGap = prev && page - prev > 1;
              const isActive = validCurrentPage === page;
              return (
                <React.Fragment key={page}>
                  {hasGap && <span className="px-1 text-slate-400 font-bold">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, validCurrentPage + 1))}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          title="Próxima página"
          aria-label="Próxima página"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
