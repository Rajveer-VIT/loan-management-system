import React from 'react';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50/75 border-b border-gray-100">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-8 text-center text-gray-500 font-medium text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-5 py-4 text-gray-700 font-normal">
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? String(row[col.accessorKey] ?? '-')
                      : '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
