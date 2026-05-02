import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NODE_ENV = 'test'
process.env.VITEST = 'true'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default {
  root: rootDir,
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    setupFiles: ['test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
}
