import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500
  },
  define: {
    // Polyfill for some libs expecting process.env
    'process.env': {}
  }
})