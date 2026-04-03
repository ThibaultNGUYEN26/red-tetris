import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    host: 'c1r4p8',
    port: 5173,
  },
})
