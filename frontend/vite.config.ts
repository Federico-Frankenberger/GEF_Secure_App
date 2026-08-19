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
