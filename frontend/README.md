# MonoBlocks Frontend

Cornerstone Property Services — a property management and field maintenance demo app built on the MonoBlocks component system.

This is a Vite + TypeScript + React SPA that demonstrates schema-driven CRUD across 5 entity types (customers, sites, equipment, technicians, work orders) with a mock backend persisted to localStorage.

## Stack

| Layer | Tool | Version |
|-------|------|---------|
| Framework | React | 19.3 |
| Build | Vite | 8.3 |
| Language | TypeScript | 6.0 |
| Routing | TanStack Router | 1.170 (file-based) |
| Data | TanStack Query | 5.102 |
| Forms | TanStack Form | 1.33 |
| Design | Carbon Design Language | @carbon/react 1.114 |
| State | localStorage + vanilla stores | — |
| Testing | Vitest + Testing Library | 5.x |

## Getting Started

```bash
# Install (requires Node ≥ 22.19, Yarn 4.x)
yarn install

# Dev server
yarn dev

# Production build
yarn build
```

## Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start Vite dev server with HMR |
| `yarn build` | Production build (code-split, CSS not minified for debugging) |
| `yarn test` | Run unit tests once |
| `yarn test:watch` | Run tests in watch mode |
| `yarn test:coverage` | Run tests with v8 coverage (thresholds: 85/85/85/85) |
| `yarn lint` | ESLint with zero-warning policy |
| `yarn typecheck` | TypeScript strict-mode check |

## Architecture

### Directory Structure

```
src/
  schema/       Entity definitions, types, config, API helpers
  api/          Mock backend (localStorage, simulated latency)
  utils/        Display formatters, validators
  stores/       Vanilla reactive stores (theme, nav, toast)
  hooks/        React hooks (useEntityList, useEntityDetail, useDashboard, etc.)
  styles/       CSS custom properties + component styles (ported from prototype)
  components/   UI components (AppShell, ListPage, DetailPage, FormPage, etc.)
  routes/       TanStack Router file-based routes
  main.tsx      App entry (QueryClient + RouterProvider)
```

### Schema-Driven Design

All 5 entity types are defined in `src/schema/config.ts`. Components read the schema to render tables, forms, detail views, and navigation automatically. Adding a new entity requires:

1. Add the entity config to `SCHEMA` in `src/schema/config.ts`
2. Add seed data in `src/api/seed.ts`
3. Add route files in `src/routes/_app/<entity>/`

### API Pipeline

All HTTP communication flows through a Koa-style middleware pipeline in `src/http/`. The stack is:

- **`Resource<T>`** base class -- constructs `RequestContext` from method/path/data and sends it through a transport
- **Middleware chain** -- auth (Bearer token), trace (B3 headers), retry (5xx + NetworkError with exponential backoff), headers (extract response headers)
- **Transport** -- either the axios transport (`src/http/transport.ts`, the only file importing axios) or the mock transport (`src/api/mock-transport.ts`, routes URLs to mockDb)
- **Transport resolver** -- `getTransport()` / `setTransport()` in `src/api/transport-resolver.ts` controls which transport the app uses (defaults to mock)

Hooks call `getEntityResource(type)` from the entity resource factory, which returns a cached `CrudResource` using the current transport. Swapping from mock to real backend requires one `setTransport()` call before app render.

See the [API Connection Layer](../../mono-blocks.wiki/patterns/API-Connection-Layer.md) wiki page for the full reference -- middleware catalog, REST mapping table, error hierarchy, mock URL routing, and step-by-step guides for adding routes and replacing the mock backend.

### Mock Backend

`src/api/mockDb.ts` provides a localStorage-backed mock API with:

- **300--700ms simulated latency** per request
- **One-shot `failNext`** for error-state testing
- **CRUD operations**: `list`, `getRecord`, `create`, `update`, `remove`
- **Relations**: `related` returns outbound/inbound relations + events
- **Uniqueness**: `checkUnique` for async form validation
- **Reset**: restores seed data (SEED_VERSION 3)

Storage key: `mb-data-v1` in localStorage.

The mock transport in `src/api/mock-transport.ts` adapts mockDb to the `Transport` interface, parsing URLs like `/api/customers/cust-001/related` into the corresponding mockDb calls. The transport resolver in `src/api/transport-resolver.ts` defaults to this mock transport, so the app works out of the box with no backend. See the [API Connection Layer](../../mono-blocks.wiki/patterns/API-Connection-Layer.md) wiki page for the full URL routing table and transport-swapping instructions.

### Theming

Three brand skins on top of Carbon's light/dark themes:

| Skin | Description |
|------|-------------|
| **Cornerstone** (default) | Blue accent, warm neutrals |
| **Mono** | Graphite/neutral accent |
| **Ember** | Terracotta accent |

Theme and skin preferences persist in localStorage (`mb-theme`, `mb-skin`) with a pre-paint boot script in `index.html` to prevent FOUC.

### CSS

The CSS is ported directly from the static prototype and uses CSS custom properties exclusively:

- `tokens.css` — All design tokens (light/dark/skin variants)
- `base.css` — Reset, body defaults, type utilities, focus rings
- `shell.css` — Header, sidenav (push-style), grid, ViewTransition
- `components.css` — Buttons, forms, tables, tags, tiles, toasts, etc.

All tokens are prefixed `--cds-*` to align with Carbon's naming convention.

## Quality Gates

All four gates must pass with zero warnings/errors:

```bash
tsc --noEmit          # TypeScript strict mode
eslint . --max-warnings=0  # Zero-warning lint policy
vitest run            # Unit tests (coverage thresholds enforced)
vite build            # Production build
```

Coverage thresholds: 85% statements, 85% branches, 85% functions, 85% lines.

## Entity Fixture Recipe

To add test fixture data for a specific entity:

```ts
import * as mockDb from '@/api/mockDb';

// 1. Reset to clean seed
await mockDb.reset();

// 2. Create custom records
await mockDb.create('customer', {
  name: 'Test Corp',
  billing_email: 'test@example.com',
  tier: 'premium',
  status: 'active',
  contract_start: '2026-01-15',
});

// 3. Optionally simulate a failure
mockDb.setFailNext(true);

// 4. Read synchronously for assertions
const all = mockDb.peek('customer');
const events = mockDb.peekEvents();
```

## Browser Checklist

- [x] Chrome/Edge (Chromium)
- [x] Firefox
- [x] Safari (WebKit)
- [x] Reduced motion (`prefers-reduced-motion`)
- [x] Keyboard navigation (skip link, focus-visible, tab order)
- [x] Screen reader landmarks (banner, nav, main)
