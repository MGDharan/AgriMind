import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      // Dev proxy — Nginx handles this in production
      '/api': 'http://localhost:8001',
      '/uploads': 'http://localhost:8001',
      '/health': 'http://localhost:8001',
    },
  },
})
