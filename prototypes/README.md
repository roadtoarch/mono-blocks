# Prototypes

This folder contains interactive HTML prototypes for design system exploration and validation.

## Contents

- **design-system-prototype.html** — Visual demonstration of the SPAT Design System with:
  - Per-tenant color switching (ACME blue, NorthPac green)
  - Light/dark mode toggle
  - OKLCH color palette visualization
  - Typography showcase (9 semantic tokens)
  - Component demos (buttons, cards, inputs)
  - Spacing scale visualization

## Convention

All prototypes should be:
- Self-contained HTML files (no external dependencies except CDN fonts)
- Named descriptively: `<feature-or-system>-prototype.html`
- Documented in this README when added

## Opening Prototypes

```bash
# Open the design system prototype
open prototypes/design-system-prototype.html

# Or use any browser
firefox prototypes/design-system-prototype.html
```

## Related Documentation

- Design system spec: [`/DESIGN.md`](../DESIGN.md)
- Wiki architecture overview: [`mono-blocks.wiki/architecture/frontend/Design-System-Overview.md`](../mono-blocks.wiki/architecture/frontend/Design-System-Overview.md)
- Per-tenant theming pattern: [`mono-blocks.wiki/patterns/Per-Tenant-Theming.md`](../mono-blocks.wiki/patterns/Per-Tenant-Theming.md)
