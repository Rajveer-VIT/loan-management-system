import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Pagination as PaginationMeta } from '../../types';

interface PaginationProps {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
  label?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange, label = 'results' }) => {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
      <p>
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{meta.total}</span> {label}
      </p>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!meta.hasPrev} onClick={() => onPageChange(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </Button>
          <span aria-current="page" className="px-1">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => onPageChange(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
};
