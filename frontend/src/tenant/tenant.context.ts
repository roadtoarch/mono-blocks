import { createContext } from 'react';

import type { TenantConfig } from './tenant.types';

/**
 * React context holding the resolved {@link TenantConfig}.
 *
 * Defaults to `undefined` — consumers must use the {@link useTenant} guard
 * hook, which throws when accessed outside a {@link TenantProvider}.
 */
export const TenantContext = createContext<TenantConfig | undefined>(undefined);
