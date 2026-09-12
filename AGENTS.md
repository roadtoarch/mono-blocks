# AGENTS.md

## Repo layout

Monorepo-scaffold. Currently only one package exists:

- `frontend/` — Vite 8 + React 19.2 + TypeScript 6 app (default Vite scaffold). Entry: `frontend/src/main.tsx`, root component `frontend/src/App.tsx`. PWA: Serwist service worker (`frontend/src/sw.ts`), IndexedDB via Dexie (`frontend/src/db/`), offline middleware pipeline.

There is no backend, no shared `packages/`, and no root `package.json` — "monorepo" today means `frontend/` alone. New packages go in a sibling directory at the repo root; run all package commands with `--prefix frontend` (or `cd frontend`).

## Commands (all from `frontend/`)

- Dev: `yarn dev`
- Build: `yarn build` — runs `tsc -b` first, so it is also the typecheck (no separate `check` script)
- Lint: `yarn lint` (ESLint 10 flat config in `frontend/eslint.config.js`, with `typescript-eslint`, `react-hooks`, `react-refresh`)
- Test: `yarn test` (Vitest 5, jsdom, globals enabled). Test files use `*.unit.test.ts(x)` naming convention under `src/`.
- Test (watch): `yarn test:watch`
- Test (coverage): `yarn test:coverage` — v8 provider, 85% threshold on lines/functions/branches/statements.
- Verify a change: `yarn lint && yarn build && yarn test`

## Gotchas

- **Vitest is inline in `vite.config.ts`** — no separate `vitest.config.ts`. Config: `globals: true`, `environment: 'jsdom'`, `clearMocks: true`, includes `src/**/*.unit.test.{ts,tsx}`.
- TypeScript project references: build uses `tsc --build` against `tsconfig.json` → `tsconfig.app.json` (app src) + `tsconfig.node.json` (vite.config.ts). Keep config files typechecked under the node project.
- Yarn 4 (Berry) + `yarn.lock` — use Yarn, not npm/pnpm. Corepack manages the Yarn version via the `packageManager` field in `package.json`.
- Root `.gitignore` ignores `node_modules` globally; don't add per-package ignore files for it.
- **Service worker has its own tsconfig** — `frontend/tsconfig.sw.json` uses `WebWorker` lib, not DOM. The main `tsconfig.app.json` excludes `src/sw.ts`.
- **SW is opt-in in dev** — requires `VITE_ENABLE_SW=true` to register. Without it, `yarn dev` runs without SW.
- **IndexedDB via Dexie** — `frontend/src/db/app-db.ts` defines 4 tables: `pins` (PinnedRecord), `cachedQueries` (CachedQuery), `mutations` (PendingMutation), `httpCache` (HttpCacheEntry). Schema is versioned.
- **Offline middleware pipeline** — 7-step stack in `api-client.ts`: auth → trace → retry → headers → cache → offline → transport. Cache middleware (GET dedup/TTL); offline middleware (queues non-GET when offline + OFFLINE_ALLOWED).
- **`OFFLINE_ALLOWED` is a user role** — from OIDC `realm_access.roles`, NOT a tenant feature flag. Use `useOfflineAllowed()` hook, not `useFeature()`.
- **Query keys include accessToken** — `['users', accessToken, page, size]`. Token refresh causes stale cache entries. Known limitation.
