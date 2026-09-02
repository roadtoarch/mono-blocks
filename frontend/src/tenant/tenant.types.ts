export interface TenantTheme {
  primary: string;
  primaryText: string;
  headerBackground: string;
  headerText: string;
  logoUrl: string;
  faviconUrl: string;
}

export interface TenantConfig {
  subdomain: string;
  tenantId: string;
  displayName: string;
  keycloakClientId: string;
  theme: TenantTheme;
}

export interface TenantManifest {
  tenants: TenantConfig[];
  default: string;
}
