import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  root: '.',
  build: {
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    // Por defecto solo localhost. VITE_HOST=true → escucha en 0.0.0.0 para que
    // otras PCs de la red local puedan abrir http://<tu-ip>:5173 (solo en una red de confianza)
    host: process.env.VITE_HOST === 'true',
    proxy: {
      // API Express local (server.js en la raíz del proyecto)
      '/api': process.env.VITE_PROXY_API || 'http://localhost:3001',
    }
  }
})
