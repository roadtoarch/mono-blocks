import path from 'node:path';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Carbon alias for test runs only — see resolve.alias below.
const testOnly = process.env.VITEST === 'true';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      // @carbon/react ships no `exports` map (only legacy main/module fields).
      // Vitest's node-style resolution otherwise picks `main` (CJS lib/), and
      // the CJS chain require()s ESM-only temporal-polyfill, which throws
      // "Cannot use import statement outside a module" inside the vmThreads
      // pool. Pin the ESM entry (the same file the bundler picks via
      // `module`) — but only for test runs: the production build and dev
      // server must keep resolving the package root, because styles.scss
      // does `@use '@carbon/react'` and needs the package's index.scss.
      // Anchored so subpath imports (@carbon/react/icons, …) resolve
      // normally.
      ...(testOnly
        ? [
            {
              find: /^@carbon\/react$/,
              replacement: path.resolve(
                import.meta.dirname,
                'node_modules/@carbon/react/es/index.js',
              ),
            },
          ]
        : []),
    ],
  },
  plugins: [
    // TanStack Router — file-based route tree generation.
    // MUST precede react() so route modules are transformed after codegen.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  build: {
    // Carbon v11 ships `@position-try` anchor-positioning rules that
    // lightningcss cannot yet minify — skip CSS minification to avoid
    // a parse error on those at-rules.
    cssMinify: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    pool: 'vmThreads',
    include: ['src/**/*.unit.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
      exclude: ['**/node_modules/**', '**/*.unit.test.{ts,tsx}', '**/*.d.ts', '**/types/**'],
    },
  },
});
