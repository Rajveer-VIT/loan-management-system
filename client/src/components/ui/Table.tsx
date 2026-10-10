import React from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on small screens to keep the table readable on mobile. */
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  caption: string;
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

export function Table<T>({ caption, columns, data, getRowKey, isLoading = false, emptyState }: TableProps<T>) {
  const cellVisibility = (col: Column<T>) => (col.hideOnMobile ? 'hidden md:table-cell' : '');

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  scope="col"
                  className={`whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${cellVisibility(col)} ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  {columns.map((col) => (
                    <td key={col.header} className={`px-4 py-4 ${cellVisibility(col)}`}>
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyState ?? 'No records found.'}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={getRowKey(row)} className="align-top hover:bg-slate-50/60">
                  {columns.map((col) => (
                    <td key={col.header} className={`px-4 py-3.5 text-slate-700 ${cellVisibility(col)} ${col.className ?? ''}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
