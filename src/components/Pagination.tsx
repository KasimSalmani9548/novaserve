import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange?: (n: number) => void;
}

export function Pagination({ total, page, perPage, onPageChange, onPerPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages = useMemo(() => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('...');
      arr.push(totalPages);
    }
    return arr;
  }, [totalPages, page]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Showing {start}-{end} of {total}</span>
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2 py-1 rounded border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) => p === '...' ? (
          <span key={'e' + i} className="px-2 text-slate-500 text-xs">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded text-xs font-medium ${p === page ? 'bg-emerald-600 text-white' : 'border border-slate-800 text-slate-300 hover:bg-slate-800'}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-2 py-1 rounded border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
