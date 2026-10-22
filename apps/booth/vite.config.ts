import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // The booth talks to apps/back for uploads; proxying avoids CORS in dev.
    proxy: { '/api': 'http://localhost:4000' },
  },
})
