import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    reporters: ['./vitest.reporter.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        'src/main.jsx',
        'src/index.jsx',
      ],
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70,
    },
  },
})
