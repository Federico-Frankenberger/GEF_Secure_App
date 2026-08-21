import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl', '2xl': 'max-w-6xl' }

export default function Modal({ title, open, onClose, children, size = 'md' }: Props) {
  // FE-12 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes el efecto no estaba
  // condicionado por `open` -- cada instancia de Modal montada en la página (varias
  // páginas montan más de una, casi siempre con open=false) agregaba su propio listener
  // global de Escape aunque no estuviera visible. Presionar Escape en cualquier lado
  // disparaba el onClose de TODOS los modales montados, no solo el visible.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} max-h-[90vh] flex flex-col bg-surface-800 border border-surface-600
                       rounded-2xl shadow-2xl animate-slide-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600 shrink-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-1.5 !py-1">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
