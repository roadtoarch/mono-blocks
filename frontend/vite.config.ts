import path from 'node:path';

import babel from '@rolldown/plugin-babel';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  plugins: [
    // TanStack Router — file-based route tree generation.
    // MUST precede react() so route modules are transformed after codegen.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    // React Compiler — auto-memoizes components/hooks; see react.dev/learn/react-compiler
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    // Allow *.localhost subdomains so acme.localhost and northpac.localhost
    // resolve to the Vite dev server for multi-tenant development.
    allowedHosts: ['.localhost'],
  },
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
