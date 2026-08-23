import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Reveal from './Reveal'

const ITEMS = [
  {
    q: '¿Qué es GEF Secure?',
    a: 'Una plataforma de gestión continua de vulnerabilidades: centraliza tus activos y su software, detecta vulnerabilidades conocidas y te ayuda a priorizar y hacer seguimiento de su remediación.',
  },
  {
    q: '¿Necesito instalar un agente?',
    a: 'No. Registrás tus activos y el software instalado en la plataforma, y GEF Secure correlaciona esa información contra las fuentes de vulnerabilidades.',
  },
  {
    q: '¿Qué fuentes de vulnerabilidades utiliza?',
    a: 'CVE, GitHub Security Advisories y el catálogo CISA KEV de vulnerabilidades con explotación conocida.',
  },
  {
    q: '¿Cómo se relacionan las vulnerabilidades con mis activos?',
    a: 'A través del software instalado en cada activo: cuando una vulnerabilidad afecta a un componente que tenés registrado, queda vinculada a ese activo puntual.',
  },
  {
    q: '¿GEF Secure reemplaza un antivirus?',
    a: 'No. GEF Secure es gestión de vulnerabilidades, no protección en tiempo real ni detección de malware.',
  },
  {
    q: '¿Puedo usarlo con múltiples activos y entornos?',
    a: 'Sí, el modelo está pensado para múltiples activos organizados por entorno (por ejemplo, producción, testing, desarrollo).',
  },
  {
    q: '¿Cada cuánto se actualiza la información?',
    a: 'Un escaneo automático corre todos los días, y además podés disparar escaneos manuales cuando lo necesites.',
  },
  {
    q: '¿Cómo puedo probar la plataforma?',
    a: 'Solicitando una demo desde el formulario de contacto de esta página.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card !p-0 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown size={16} className={`text-slate-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-slate-400">{a}</p>}
    </div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">Preguntas frecuentes</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 text-balance">
          Lo que probablemente te estés preguntando
        </h2>
      </Reveal>

      <div className="space-y-3">
        {ITEMS.map((item, i) => (
          <Reveal key={item.q} delay={i * 40}>
            <FAQItem q={item.q} a={item.a} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
