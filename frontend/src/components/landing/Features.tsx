import {
  Server, PackageSearch, ScanLine, ShieldAlert, Target, KanbanSquare,
  Clock, GitBranch, History, Bell, FileText, Users,
} from 'lucide-react'
import Reveal from './Reveal'

const FEATURES = [
  { icon: Server, title: 'Gestión de activos y entornos', text: 'Inventario de servidores y aplicaciones, con criticidad de negocio y exposición por entorno.' },
  { icon: PackageSearch, title: 'Inventario de software', text: 'Qué software corre en cada activo, con su versión, para saber exactamente dónde impacta cada vulnerabilidad.' },
  { icon: ScanLine, title: 'Escaneo automático y manual', text: 'Un escaneo diario programado, más la posibilidad de disparar escaneos puntuales cuando los necesites.' },
  { icon: ShieldAlert, title: 'Detección correlacionada', text: 'Cruce automático contra CVE, GitHub Security Advisories y el catálogo CISA KEV de explotación conocida.' },
  { icon: Target, title: 'Priorización explicada', text: 'Cada prioridad muestra su motivo real: severidad, explotación, KEV y criticidad del activo — no una caja negra.' },
  { icon: KanbanSquare, title: 'Kanban de remediación', text: 'Flujo de trabajo claro — detectada, en análisis, resuelta — con asignación de responsables.' },
  { icon: Clock, title: 'SLA automático por severidad', text: 'Plazos de resolución calculados solos según la criticidad: crítica, alta, media o baja.' },
  { icon: GitBranch, title: 'Cierre con contexto (VEX)', text: 'Mitigada, no aplica o riesgo aceptado — cada cierre queda clasificado, no solo "resuelto".' },
  { icon: History, title: 'Trazabilidad completa', text: 'Historial de cada transición de estado: quién, cuándo y con qué respaldo.' },
  { icon: Bell, title: 'Notificaciones automáticas', text: 'Aviso del resultado del escaneo diario apenas está disponible, sin tener que entrar a revisar.' },
  { icon: FileText, title: 'Informes ejecutivos', text: 'Exportación en PDF de escaneos y comparativas, listos para compartir fuera de la plataforma.' },
  { icon: Users, title: 'Roles y permisos', text: 'Perfiles diferenciados para administración, análisis de seguridad, responsables de activos y auditoría.' },
]

export default function Features() {
  return (
    <section id="funcionalidades" className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">Funcionalidades</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12 text-balance">
          Todo lo necesario para gestionar el riesgo, en un solo lugar
        </h2>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 70}>
            <div className="card h-full">
              <f.icon size={18} className="text-brand-400 mb-3" />
              <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="text-sm text-slate-400">{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
