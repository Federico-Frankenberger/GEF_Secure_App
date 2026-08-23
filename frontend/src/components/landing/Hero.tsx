import { ArrowRight, PlayCircle } from 'lucide-react'
import logoGlow from '../../assets/logos/logo-vertical-glow.png'
import Reveal from './Reveal'

export default function Hero() {
  const goToAnchor = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Resplandor de marca de fondo -- puramente ambiental, sin pretender ser
          legible (el logo vertical-glow no funciona como texto, ver nota de
          Login/Sidebar); acá se usa solo como textura decorativa muy tenue. */}
      <img
        src={logoGlow}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] max-w-none opacity-[0.10]"
      />

      <div className="relative max-w-4xl mx-auto px-4 md:px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
        <Reveal>
          <span className="badge bg-brand-600/10 text-brand-400 border border-brand-600/30 mb-5">
            Gestión de vulnerabilidades
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight text-balance">
            Gestioná vulnerabilidades antes de que se conviertan en incidentes
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-5 text-base md:text-lg text-slate-400 max-w-2xl mx-auto text-balance">
            GEF Secure centraliza tus activos, detecta vulnerabilidades conocidas en el software
            que usás y te ayuda a priorizar qué resolver primero — con trazabilidad completa de
            cada decisión.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => goToAnchor('#contacto')} className="btn-primary !px-6 !py-3 text-sm">
              Solicitar demo <ArrowRight size={15} />
            </button>
            <button onClick={() => goToAnchor('#como-funciona')} className="btn-ghost !px-6 !py-3 text-sm border border-surface-600">
              <PlayCircle size={15} /> Ver cómo funciona
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
