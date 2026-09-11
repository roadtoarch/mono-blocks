import { use } from 'react';

import { TenantContext } from './tenant.context';

import type { TenantConfig } from './tenant.types';

/**
 * Returns the current {@link TenantConfig} from the nearest
 * `TenantProvider`. Throws when used outside the provider.
 */
export const useTenant = (): TenantConfig => {
  const tenant = use(TenantContext);
  if (!tenant) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return tenant;
};
