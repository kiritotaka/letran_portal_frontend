import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  itemName?: string;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemName = 'bản ghi',
  isLoading = false
}) => {
  if (total === 0) return null;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  // Generate page numbers to show (max 5 visible buttons)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      id="server-pagination-bar"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600"
    >
      {/* Information & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-500">
          Hiển thị <strong className="text-slate-800 font-semibold">{startRecord}</strong> -{' '}
          <strong className="text-slate-800 font-semibold">{endRecord}</strong> trong tổng số{' '}
          <strong className="text-slate-800 font-semibold">{total}</strong> {itemName}
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-400">| Số dòng:</span>
            <select
              id="pagination-limit-select"
              value={limit}
              onChange={(e) => {
                const newLim = parseInt(e.target.value, 10);
                onLimitChange(newLim);
              }}
              disabled={isLoading}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        )}

        {isLoading && (
          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium animate-pulse">
            Đang tải dữ liệu máy chủ...
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          id="pagination-btn-first"
          title="Trang đầu"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev Page */}
        <button
          type="button"
          id="pagination-btn-prev"
          title="Trang trước"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isLoading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 text-xs select-none">
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                id={`pagination-btn-page-${p}`}
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          id="pagination-btn-next"
          title="Trang kế tiếp"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          id="pagination-btn-last"
          title="Trang cuối"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
