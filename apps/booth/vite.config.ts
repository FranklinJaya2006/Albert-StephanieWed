import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // The admin desk reuses the invitation's Admin page, so it reads the same .env files (VITE_N8N_WEBHOOK_BASE).
  envDir: "../web",
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 5175,
    // Admin API stays on the same origin. Personal links open the invitation app.
    host: true,
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
})
