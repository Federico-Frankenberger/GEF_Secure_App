/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design System "Centro de Operaciones" (Paso 3, confirmado): reemplaza el
        // indigo generico por un cian de instrumentacion. Los NOMBRES de clase
        // (brand-*, surface-*) no cambian -- ningun componente necesita tocar sus
        // clases, solo cambian los valores hex.
        brand: {
          50:  '#ecfeff',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        surface: {
          900: '#0a0f14',
          800: '#10161c',
          700: '#17212a',
          600: '#1c2830',
        },
        // Familia nueva, separada del acento -- antes duplicada como hex crudo en
        // constants/badges.ts, Dashboard.tsx, Assets.tsx, Settings.tsx y
        // VulnerabilityCard.tsx (P-03 de la auditoria UX/UI).
        severity: {
          critical: '#f87171',
          high:     '#fb923c',
          medium:   '#facc15',
          low:      '#4ade80',
        },
        // Concepto distinto de severity.* aunque hoy comparta los mismos 4 hex "por
        // coincidencia" (P-03 de la auditoria UX/UI): criticidad de NEGOCIO de un
        // Entorno (BAJA/MEDIA/ALTA/CRITICA), no severidad de una vulnerabilidad
        // puntual. Token propio para que un cambio de paleta de severidad no mueva
        // sin querer el de criticidad de entorno, y viceversa.
        criticality: {
          baja:    '#4ade80',
          media:   '#facc15',
          alta:    '#fb923c',
          critica: '#f87171',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(-8px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
      animation: {
        'fade-in':  'fadeIn 0.35s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
