import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
import Reveal from './Reveal'

/** Sección 16 del prompt de landing: CTA comercial final + formulario de contacto.
 *  No existe backend para leads comerciales todavía (sección "Conversión comercial"
 *  del prompt autoriza explícitamente dejarlo solo visual con un TODO en vez de
 *  inventar un endpoint) -- el envío solo muestra confirmación, no persiste nada. */
export default function ContactCTA() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // TODO: conectar a un endpoint real de leads/CRM cuando exista backend comercial.
    setSent(true)
    toast.success('¡Gracias! Te vamos a contactar a la brevedad.')
  }

  return (
    <section id="contacto" className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <div className="card !p-8 md:!p-12 text-center bg-gradient-to-b from-brand-600/10 to-transparent">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-balance">
            Conocé el estado de seguridad de tu infraestructura
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto mb-8 text-balance">
            Centralizá activos, vulnerabilidades y alertas desde una única plataforma.
          </p>

          {sent ? (
            <div className="max-w-md mx-auto">
              <p className="text-sm text-severity-low font-medium">
                Recibimos tu consulta. Te vamos a contactar a la brevedad.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto text-left space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  className="input"
                  placeholder="Nombre"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <input
                  required
                  type="email"
                  className="input"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <input
                className="input"
                placeholder="Empresa (opcional)"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Contanos brevemente tu caso"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
              <button type="submit" className="btn-primary w-full justify-center">
                Solicitar demo <Send size={14} />
              </button>
            </form>
          )}

          <button onClick={() => navigate('/login')} className="btn-ghost mx-auto mt-6 text-sm">
            ¿Ya tenés cuenta? Iniciar sesión
          </button>
        </div>
      </Reveal>
    </section>
  )
}
