import { useTenant } from '../../tenant/useTenant';

import SideNavLayout from './SideNavLayout';
import TopNavLayout from './TopNavLayout';

import type { FC, ReactNode } from 'react';

interface AppShellRouterProps {
  readonly children: ReactNode;
}

/**
 * Reads the tenant's `layout` setting and renders the appropriate shell
 * variant — {@link TopNavLayout} for `'top-nav'` (default) or
 * {@link SideNavLayout} for `'side-nav'`.
 */
const AppShellRouter: FC<AppShellRouterProps> = ({ children }) => {
  const tenant = useTenant();

  if (tenant.layout === 'side-nav') {
    return <SideNavLayout>{children}</SideNavLayout>;
  }

  return <TopNavLayout>{children}</TopNavLayout>;
};

export default AppShellRouter;
