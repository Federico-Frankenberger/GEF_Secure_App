import { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => ReactNode
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  keyField?: keyof T
  onRowClick?: (row: T) => void
  selectedKey?: number | string | null
}

export default function Table<T extends { id?: number | string }>({
  columns, data, loading, emptyMessage = 'Sin datos', keyField = 'id' as keyof T,
  onRowClick, selectedKey,
}: Props<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-700 border-b border-surface-600">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-600">
          {!data.length ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : data.map((row, idx) => (
            <tr
              key={String(row[keyField] ?? idx)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}
                ${selectedKey != null && row[keyField] === selectedKey
                  ? 'bg-brand-600/10 hover:bg-brand-600/15'
                  : 'hover:bg-surface-700/50'}`}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-slate-300">
                  {col.render
                    ? col.render((row as Record<string, unknown>)[col.key as string], row)
                    : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
