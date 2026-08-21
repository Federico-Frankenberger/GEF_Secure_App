/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite pone sus bundles hasheados en dist/assets/ por defecto, lo que choca
  // con la ruta de la app /assets (página "Activos"): nginx intercepta esa
  // ruta como si fuera el directorio estático y nunca llega a servir el SPA.
  build: {
    assetsDir: 'static',
  },
  // Fase 7 (docs/20-08-26/PLAN_DE_IMPLEMENTACION.md): primer test runner de frontend
  // del proyecto (antes cero tests, ver informe §20/§26). Vitest reusa esta misma config
  // de Vite (mismos alias/plugins que el build real), no hace falta un config separado.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 5173,
    proxy: {
      // En desarrollo local: el backend corre en 8081 (igual que Docker lo expone)
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
