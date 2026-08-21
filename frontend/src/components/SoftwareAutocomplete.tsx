import { useEffect, useRef, useState } from 'react'
import { softwareCatalogApi } from '../services/api'
import type { SoftwareCatalogEntry } from '../types'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (entry: SoftwareCatalogEntry) => void
  placeholder?: string
}

/** Combobox chico sin dependencias externas: busca contra /api/software-catalog con debounce manual. */
export default function SoftwareAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SoftwareCatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  // FE-04 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes un error de red y "0 resultados"
  // mostraban el mismo mensaje ("Sin coincidencias") -- el usuario no podía distinguir
  // "este paquete no está en el catálogo" (esperable, usa el modo texto libre) de
  // "el catálogo no respondió" (reintentable).
  const [error, setError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!value.trim()) {
      setResults([])
      setError(false)
      return
    }
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      softwareCatalogApi.search(value.trim())
        .then(r => { setResults(r.data); setError(false) })
        .catch(() => { setResults([]); setError(true) })
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  const handleSelect = (entry: SoftwareCatalogEntry) => {
    onSelect(entry)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && value.trim() && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-surface-700 border border-surface-600 rounded-lg shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-xs text-slate-500">Buscando…</div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-yellow-400">No se pudo consultar el catálogo (error de red)</div>
          ) : results.length > 0 ? (
            results.map(entry => (
              <button
                key={entry.id}
                type="button"
                onMouseDown={() => handleSelect(entry)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-surface-600 flex items-center justify-between gap-2"
              >
                <span>{entry.displayName || entry.packageName}</span>
                <span className="text-xs text-slate-500">{entry.ecosystem}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500">Sin coincidencias en el catálogo</div>
          )}
        </div>
      )}
    </div>
  )
}
