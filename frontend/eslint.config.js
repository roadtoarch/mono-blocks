import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'
import importX from 'eslint-plugin-import-x'
import tanstackQuery from '@tanstack/eslint-plugin-query'
import tanstackRouter from '@tanstack/eslint-plugin-router'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
      ...tanstackRouter.configs['flat/recommended'],
      eslintConfigPrettier,
    ],
    plugins: {
      'import-x': importX,
      '@tanstack/query': tanstackQuery,
      '@tanstack/router': tanstackRouter,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
      '@tanstack/query/exhaustive-deps': 'warn',
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Axios must only be imported from http/transport.ts — all other
      // files use the pipeline instead.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'axios must only be imported from src/http/transport.ts. Use the middleware pipeline instead.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json', './tsconfig.sw.json', './tsconfig.vitest.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Allow axios import in the designated transport boundary file.
  {
    files: ['src/http/transport.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Relax require-await for test callbacks — middleware signatures require
  // async returns even when the body is synchronous.
  // Also relax strict type-checked rules that conflict with Vitest matchers.
  {
    files: ['**/*.unit.test.{ts,tsx}', '**/*.e2e.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
])
