import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from a subfolder: the workflow sets VITE_BASE=/<repo>/. Everywhere
  // else (dev, Docker/Caddy) it stays at the root.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
})
