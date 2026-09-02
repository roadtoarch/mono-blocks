import type { TenantTheme } from './tenant.types';

export function applyTenantTheme(theme: TenantTheme): void {
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
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  return [
    parseInt(cleaned.substring(0, 2), 16),
    parseInt(cleaned.substring(2, 4), 16),
    parseInt(cleaned.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
