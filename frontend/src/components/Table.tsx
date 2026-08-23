import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => ReactNode
  /** P-06 (auditoría UX/UI): ninguna tabla permitía ordenar columnas -- el orden
   *  quedaba fijo a lo que decidiera el backend. Ordena sobre los datos ya
   *  presentes en `data` (la página actual en modo servidor, el dataset
   *  completo en modo cliente) -- no dispara un nuevo pedido al backend. */
  sortable?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  keyField?: keyof T
  onRowClick?: (row: T) => void
  selectedKey?: number | string | null
  /** Habilita paginación. Sin `page`/`totalItems`/`onPageChange` pagina en el
   *  cliente (asume que `data` ya trae TODo el dataset). Con los tres, queda en
   *  modo servidor: `data` es solo la página actual y la navegación se delega
   *  al padre vía `onPageChange`. */
  pageSize?: number
  page?: number
  totalItems?: number
  onPageChange?: (page: number) => void
}

export default function Table<T extends { id?: number | string }>({
  columns, data, loading, emptyMessage = 'Sin datos', keyField = 'id' as keyof T,
  onRowClick, selectedKey, pageSize, page: serverPage, totalItems, onPageChange,
}: Props<T>) {
  const serverMode = pageSize != null && onPageChange != null
  const [clientPage, setClientPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modo cliente: si cambia el dataset (nueva búsqueda/filtro/recarga) hay que
  // volver a la primera página -- si no, se puede quedar "varado" en una página
  // que ya no existe.
  useEffect(() => { if (pageSize != null && !serverMode) setClientPage(0) }, [data, pageSize, serverMode])

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const withIndex = data.map((row, i) => ({ row, i }))
    withIndex.sort((a, b) => {
      const av = (a.row as Record<string, unknown>)[sortKey]
      const bv = (b.row as Record<string, unknown>)[sortKey]
      if (av == null && bv == null) return a.i - b.i
      if (av == null) return 1
      if (bv == null) return -1
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), 'es', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return withIndex.map(w => w.row)
  }, [data, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir('asc') }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
      </div>
    )
  }

  const page = serverMode ? (serverPage ?? 0) : clientPage
  const total = serverMode ? (totalItems ?? 0) : data.length
  const totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const pageData = pageSize && !serverMode ? sortedData.slice(page * pageSize, (page + 1) * pageSize) : sortedData

  const goToPage = (target: number) => {
    const clamped = Math.min(Math.max(target, 0), totalPages - 1)
    if (serverMode) onPageChange?.(clamped)
    else setClientPage(clamped)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-700 border-b border-surface-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(String(col.key))}
                      className="flex items-center gap-1 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
                      aria-label={`Ordenar por ${col.label}`}
                    >
                      {col.label}
                      {sortKey !== String(col.key) ? (
                        <ChevronsUpDown size={12} className="text-slate-600" />
                      ) : sortDir === 'asc' ? (
                        <ChevronUp size={12} className="text-brand-400" />
                      ) : (
                        <ChevronDown size={12} className="text-brand-400" />
                      )}
                    </button>
                  ) : col.label}
                </th>
              ))}
              {onRowClick && <th className="w-8 px-2" aria-hidden />}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-600">
            {!pageData.length ? (
              <tr>
                <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="text-center py-12 text-slate-500 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : pageData.map((row, idx) => (
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
                {onRowClick && (
                  <td className="px-2 text-slate-500">
                    <ChevronRight size={15} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize != null && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-600 text-xs text-slate-400">
          <span>Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="btn-ghost !py-1 !px-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} /> Anterior
            </button>
            <span className="px-2">Página {page + 1} de {totalPages}</span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="btn-ghost !py-1 !px-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
