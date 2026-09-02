import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler — auto-memoizes components/hooks; see react.dev/learn/react-compiler
    babel({ presets: [reactCompilerPreset()] }),
  ],
  build: {
    // Carbon v11 ships `@position-try` anchor-positioning rules that
    // lightningcss cannot yet minify — skip CSS minification to avoid
    // a parse error on those at-rules.
    cssMinify: false,
  },
});
