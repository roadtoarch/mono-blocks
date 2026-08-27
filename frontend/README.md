# React + TypeScript + Vite

> Production-ready scaffold with Carbon Design System (nr-theme), TanStack Query/Form/Router, React Compiler, strict TypeScript ESLint, and Prettier.

## Tech stack

- React 19.2 + React Compiler (auto memoization via plugin-react)
- TypeScript 6 (project references `tsconfig.app.json` / `tsconfig.node.json`)
- Vite 8
- Carbon Design System v11 (`@carbon/react`) + `@bcgov-nr/nr-theme`
- TanStack Query v5, TanStack Form v1, TanStack Router v1
- Sass for Carbon styling

## Available scripts

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build (typecheck + production build)
npm run lint     # ESLint with strict type-checked rules, React DOM/X, import order, Prettier, @tanstack/query rules
npm run preview  # Preview production build
```

## Lint / code quality

- ESLint flat config with `typescript-eslint` strict + stylistic type-checked configs
- `eslint-plugin-react-x` / `eslint-plugin-react-dom` recommended TypeScript
- `@tanstack/eslint-plugin-query` for Query exhaustive-deps warnings
- `eslint-plugin-import-x` import ordering (builtin / external / internal / parent / sibling / index)
- `prettier` run via `eslint-plugin-prettier` (singleQuote, trailingComma all, printWidth 100, semi)
- `.editorconfig` enforces LF, 2-space indent, final newline
- `.npmrc` – `engine-strict=true`; node `>=22.19.0` required

## Deferred / future add-ons (planned)

Unit testing with **Vitest + Testing Library**, coverage, Playwright E2E, accessibility (`@axe-core/playwright`) and WireMock stubs. These are tracked in this README until enabled.

## Gotchas

- No test runner configured yet.
- `npm run build` doubles as the TypeScript type-check.
- Build artifacts: `dist/` (ignored by Prettier).
- Keep imports grouped per `import-x/order` — empty line between groups enforced.
