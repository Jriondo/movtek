import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite. host:true permite ver la app desde la vista previa.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
})
