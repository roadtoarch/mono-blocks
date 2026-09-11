import type { TenantConfig, TenantManifest } from './tenant.types';

const MANIFEST_URL = '/tenants.json';

let cachedManifest: TenantManifest | null = null;

const loadManifest = async (): Promise<TenantManifest> => {
  if (cachedManifest) return cachedManifest;
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to load tenant manifest: ${String(response.status)}`);
  }
  cachedManifest = (await response.json()) as TenantManifest;
  return cachedManifest;
};

export const resolveSubdomain = (hostname: string): string | null => {
  const match = /^([a-z0-9-]+)\.localhost$/.exec(hostname);
  return match?.[1] ?? null;
};

export const resolveTenant = async (hostname?: string): Promise<TenantConfig> => {
  const manifest = await loadManifest();
  const host = hostname ?? window.location.hostname;
  const subdomain = resolveSubdomain(host);

  const tenant = subdomain ? manifest.tenants.find((t) => t.subdomain === subdomain) : null;

  if (tenant) return tenant;

  const fallback = manifest.tenants.find((t) => t.subdomain === manifest.default);
  if (!fallback) {
    throw new Error(`No default tenant found in manifest`);
  }
  return fallback;
};
