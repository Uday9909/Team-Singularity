import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  optimizeDeps: {
    // maplibre-gl uses a Web Worker that Vite's optimizer can't inline
    exclude: ['maplibre-gl'],
    include: ['three', 'animejs'],
  },
})
