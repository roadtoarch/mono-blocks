import type { TenantTheme, TenantTypography } from './tenant.types';

/**
 * Curated list of font families available for tenant typography.
 * Fonts are loaded from Google Fonts CDN at runtime.
 */
export const CURATED_FONT_FAMILIES: readonly string[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Source Sans Pro',
  'Poppins',
] as const;

const GOOGLE_FONT_LINK_ID = 'tenant-google-font';

export const applyTenantTheme = (theme: TenantTheme): void => {
  const root = document.documentElement;
  root.style.setProperty('--cds-interactive', theme.primary);
  root.style.setProperty('--cds-focus', theme.primary);
  root.style.setProperty('--cds-highlight', theme.primary);
  root.style.setProperty('--cds-button-primary', theme.primary);
  root.style.setProperty('--cds-button-primary-active', darken(theme.primary, 0.15));
  root.style.setProperty('--cds-button-primary-hover', lighten(theme.primary, 0.1));
  root.style.setProperty('--cds-text-on-color', theme.primaryText);
  root.style.setProperty('--cds-border-interactive', theme.primary);
  root.style.setProperty('--cds-link-primary', theme.primary);
  root.style.setProperty('--cds-link-primary-hover', lighten(theme.primary, 0.15));

  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    favicon.href = theme.faviconUrl;
  }
};

/**
 * Applies the tenant's typography configuration:
 * - Sets Carbon v11 `--cds-body-font-family` and `--cds-heading-font-family` CSS custom properties on `:root`.
 * - Injects a `<link rel="stylesheet">` tag in `<head>` for Google Fonts.
 *
 * If the font family is not in {@link CURATED_FONT_FAMILIES}, or if `typography`
 * is `undefined`, no changes are applied (Carbon defaults are used).
 */
export const applyTenantTypography = (typography: TenantTypography | undefined): void => {
  if (!typography) {
    return;
  }

  const { fontFamily } = typography;
  if (!CURATED_FONT_FAMILIES.includes(fontFamily)) {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty('--cds-body-font-family', fontFamily);
  root.style.setProperty('--cds-heading-font-family', fontFamily);

  injectGoogleFontLink(fontFamily);
};

/**
 * Injects (or updates) a `<link rel="stylesheet">` element in `<head>` that
 * loads the given font family from Google Fonts CDN.
 */
const injectGoogleFontLink = (fontFamily: string): void => {
  const existing = document.getElementById(GOOGLE_FONT_LINK_ID);
  const href = buildGoogleFontsUrl(fontFamily);

  if (existing instanceof HTMLLinkElement) {
    if (existing.href !== href) {
      existing.href = href;
    }
    return;
  }

  const link = document.createElement('link');
  link.id = GOOGLE_FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const buildGoogleFontsUrl = (fontFamily: string): string => {
  const familyParam = encodeURIComponent(fontFamily).replace(/%20/g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;600;700&display=swap`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace('#', '');
  return [
    parseInt(cleaned.substring(0, 2), 16),
    parseInt(cleaned.substring(2, 4), 16),
    parseInt(cleaned.substring(4, 6), 16),
  ];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
};

const darken = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
};

const lighten = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
};
