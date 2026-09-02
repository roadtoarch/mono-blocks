import { TenantContext } from './tenant.context';

import type { TenantConfig } from './tenant.types';
import type { FC, ReactNode } from 'react';

interface TenantProviderProps {
  readonly children: ReactNode;
  readonly value: TenantConfig;
}

/** Provides the resolved tenant configuration to the component tree. */
const TenantProvider: FC<TenantProviderProps> = ({ children, value }) => (
  <TenantContext value={value}>{children}</TenantContext>
);

export default TenantProvider;
