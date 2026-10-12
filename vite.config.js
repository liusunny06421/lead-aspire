import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works on GitHub Pages and Azure Static Web Apps.
export default defineConfig({
  plugins: [react()],
  base: './',
})
