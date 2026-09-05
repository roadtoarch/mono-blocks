# Prototypes

Interactive HTML prototypes for design system exploration and validation.

## Structure

Each tenant has its own folder containing:
- `DESIGN.md` — Tenant-specific design system specification
- `logo-prompt.md` — AI image generation prompt for the tenant logo
- `*-landing-screen.html` — Unauthenticated landing page prototype (3 variants)
- `*-main-screen.html` — Authenticated dashboard prototype (3 variants)
- `*-logo.png` — Current tenant logo (if available)

## Tenants

| Folder | Company | Layout | Primary Color | Font |
|--------|---------|--------|---------------|------|
| `acme-corp/` | ACME Corp | Top-nav | Purple `#7050a0` | Inter |
| `northpac-moving-storage/` | NorthPac Moving & Storage | Side-nav | Green `#105030` | Source Sans Pro |
| `pacific-timber/` | Pacific Timber Co | Side-nav | Brown `#8B5E3C` | Merriweather |
| `summit-athletics/` | Summit Athletics | Hybrid | Teal `#0E8A7D` | Outfit |

## Global Files

- **design-system-prototype.html** — Interactive design system explorer with per-tenant switching
- **design-system-tokens.json** — Shared tenant token definitions (loaded by the design system prototype)

## Convention

All prototypes:
- Self-contained HTML (no build step, CDN fonts only)
- OKLCH color tokens via CSS custom properties
- Light/dark mode with `prefers-color-scheme` detection + localStorage
- 3-layer shadows (light), single-ring shadows (dark)
- Concentric border radius, `scale(0.96)` on press
- Picker harness for variant switching (keyboard: 1-N, arrows, R replay)

## Opening

```bash
# Design system explorer
open prototypes/design-system-prototype.html

# Tenant-specific prototypes
open prototypes/acme-corp/acme-main-screen.html
open prototypes/northpac-moving-storage/northpac-main-screen.html
open prototypes/pacific-timber/pacific-timber-main-screen.html
open prototypes/summit-athletics/summit-athletics-main-screen.html
```

## Related

- Design system spec: [`/DESIGN.md`](../DESIGN.md)
- Tenant config: [`/frontend/public/tenants.json`](../frontend/public/tenants.json)
