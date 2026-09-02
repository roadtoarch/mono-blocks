export interface TenantTheme {
  primary: string;
  primaryText: string;
  headerBackground: string;
  headerText: string;
  logoUrl: string;
  faviconUrl: string;
}

/** Per-tenant typography configuration. */
export interface TenantTypography {
  /** Font family name — must be in {@link CURATED_FONT_FAMILIES} to take effect. */
  fontFamily: string;
}

/** Per-tenant custom content / copy. */
export interface TenantContent {
  welcomeHeading: string;
  welcomeBody: string;
  footerText: string;
}

export interface TenantConfig {
  subdomain: string;
  tenantId: string;
  displayName: string;
  keycloakClientId: string;
  theme: TenantTheme;
  typography?: TenantTypography;
  content?: TenantContent;
  features?: Record<string, boolean>;
  /** Layout variant — defaults to `'top-nav'` when omitted. */
  layout?: 'top-nav' | 'side-nav';
}

export interface TenantManifest {
  tenants: TenantConfig[];
  default: string;
}
