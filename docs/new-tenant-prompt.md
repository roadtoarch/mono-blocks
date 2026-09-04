# New Tenant Onboarding Prompt

Use `autoprompt` to orchestrate this workflow. Load these skills before starting:
- `design-knowledge` (for Carbon v11 framework rules)
- `better-colors` (for OKLCH palette generation with accessibility contrast)
- `better-typography` (for font selection from the curated list)
- `better-ui` (for component polish recommendations)

## Phase 1: Discovery

Ask me for:
1. **Tenant name** (display name, e.g., "Acme Forestry")
2. **Tenant slug** (URL-friendly, e.g., "acme")
3. **Business type** (e.g., "forestry", "timber", "mining", "energy")
4. **Brand personality** (optional: "modern", "traditional", "bold", "eco-friendly", etc.)

## Phase 2: Visual Identity Generation

### Colors (delegating to design-specialist)
Based on the business type and brand personality, generate an OKLCH primary color:
- Use `better-colors` to pick a hue that fits the business (e.g., green for forestry/eco, blue for corporate, orange for energy)
- Ensure the color meets WCAG AA contrast (4.5:1 minimum) with white text
- Use DESIGN.md's neutral palette (hue 260° blue-gray) as the base for surfaces/borders
- Generate the full 11-step primary palette (50→950) using OKLCH space mixing
- Export as: `primary_color: oklch(L C H)` format for DESIGN.md, hex fallback for tenants.json

### Typography (delegating to design-specialist)
Select a font family from the curated list in DESIGN.md:
- **Inter** — modern, neutral, corporate (default for ACME)
- **Source Sans Pro** — clean, readable, professional (default for NorthPac)
- **Roboto** — geometric, friendly
- **Open Sans** — humanist, approachable
- **Lato** — warm, elegant
- **Poppins** — modern, bold, tech-forward

Match the font to the business personality. Confirm my choice before proceeding.

### Logo & Branding
Ask if I have a logo URL. If not, suggest using a placeholder or generating one later.

## Phase 3: Tenant Configuration

Generate a JSON entry compatible with `frontend/public/tenants.json`:

```json
{
  "<slug>": {
    "tenant_id": "<next_available_id>",
    "display_name": "<Tenant Name>",
    "keycloak_client_id": "frontend-<slug>",
    "theme": {
      "primary_color": "<hex>",
      "logo_url": "/tenants/<slug>/logo.svg",
      "favicon_url": "/tenants/<slug>/favicon.ico",
      "headerBackground": "<hex>",
      "headerText": "#ffffff",
      "primaryText": "<oklch>",
      "typography": {
        "fontFamily": "<selected font>"
      }
    },
    "layout": "top-nav",
    "content": {},
    "features": {}
  }
}
```

**Notes:**
- `tenant_id` should be the next sequential number (check existing tenants.json)
- `keycloak_client_id` follows pattern: `frontend-<slug>`
- `headerBackground` defaults to `primary_color` unless specified otherwise
- `layout` defaults to "top-nav" (ask if I prefer "side-nav")
- `content` and `features` are empty objects for now (can be extended later)

## Phase 4: Integration

### Update tenants.json
Append the new tenant entry to `frontend/public/tenants.json`.

### Update Vite config (if needed)
If the tenant requires a new subdomain in dev, add it to `vite.config.ts`:
```ts
server: {
  allowedHosts: [".localhost", "<slug>.localhost"],
}
```

### Create logo directory
Create `frontend/public/tenants/<slug>/` directory for logo assets.

### Update DESIGN.md (optional)
If the tenant's primary color becomes a reference for other tenants, consider adding it to the DESIGN.md overview as an example.

## Phase 5: Verification

Ask me to:
1. Review the generated JSON entry
2. Confirm the color choices (show me the OKLCH values and hex fallback)
3. Confirm the font selection
4. Test the tenant by visiting `<slug>.localhost:5173`

## Output

Provide:
- The complete JSON entry for tenants.json
- A summary of the visual identity (primary color in OKLCH + hex, font family, layout)
- Instructions for testing (subdomain URL, logo placement)
- Any follow-up tasks (logo generation, Keycloak client setup)

## Phase 6: Prototype Update (Optional)

If the new tenant's visual identity should be demonstrated in the design system prototype:

### Update prototypes/design-system-prototype.html
1. Add the new tenant to the `tenants` JavaScript object with:
   - `name`: display name
   - `primary`: OKLCH primary color (hue from Phase 2)
   - `primaryHover`: OKLCH hover shade (darker)
   - `primaryActive`: OKLCH active shade (darker still)
   - `fontFamily`: selected font family
   - `primaryPalette`: 10-step OKLCH palette (50→900)

2. Add a tenant selector button in the header:
   ```html
   <button class="tenant-btn" data-tenant="<slug>"><DisplayName></button>
   ```

3. Test by opening `prototypes/design-system-prototype.html` and switching to the new tenant.

**Note:** This step is optional. The prototype is for design exploration; the actual tenant configuration in `tenants.json` is what matters for production.
